import { Worker, Job } from "bullmq";
import { redis } from "../redis";
import { db } from "../db";
import { auto_reply_rules, auto_reply_logs, post_platform_results, posts } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "../platforms";
import { decryptToken } from "../encryption";
import { autoReplierQueue, COMMENT_WATCHER_QUEUE, handleJobFailure } from "../queue";
import { CommentWatcherJobData } from "./types";

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const message = (error.message || String(error)).toLowerCase();
  if (
    message.includes("invalid_grant") ||
    message.includes("invalid_client") ||
    message.includes("invalid_request") ||
    message.includes("unauthorized") ||
    message.includes("not found") ||
    message.includes("forbidden")
  ) {
    return false;
  }
  return true;
}

export const commentWatcherWorker = new Worker(
  COMMENT_WATCHER_QUEUE,
  async (job: Job<CommentWatcherJobData>) => {
    console.log("Running comment watcher...");

    try {
      // 1. Fetch all active rules with user and account
      const activeRules = await db.query.auto_reply_rules.findMany({
        where: eq(auto_reply_rules.is_active, true),
        with: {
          account: true,
          user: true,
        },
      });

      // Group active rules by user to enforce limits
      const userActiveRulesMap = new Map<string, typeof activeRules>();
      for (const rule of activeRules) {
        if (!rule.user) continue;
        const userRules = userActiveRulesMap.get(rule.user_id) || [];
        userRules.push(rule);
        userActiveRulesMap.set(rule.user_id, userRules);
      }

      // Sort each user's active rules stably by ID
      for (const [userId, rules] of userActiveRulesMap.entries()) {
        rules.sort((a, b) => a.id.localeCompare(b.id));
      }

      const retryableErrors: any[] = [];
      for (const rule of activeRules) {
        try {
          const platform = PLATFORMS[rule.platform as PlatformId];
          if (!platform || !rule.account) {
            console.error(`Missing platform or account for rule ${rule.id}`);
            continue;
          }

          const user = rule.user;
          if (!user) {
            console.error(`Missing owner for rule ${rule.id}`);
            continue;
          }

          const plan = (user.plan || "free").toLowerCase();

          // 1. Check if user plan allows any auto-reply rules
          if (plan === "free") {
            console.warn(`User ${user.id} is on free plan. Rule ${rule.id} skipped.`);
            continue;
          }

          // 2. Check if user is within the plan's active rules limit
          if (plan === "pro") {
            const userRules = userActiveRulesMap.get(rule.user_id) || [];
            const ruleIndex = userRules.findIndex((r) => r.id === rule.id);
            if (ruleIndex === -1 || ruleIndex >= 5) {
              console.warn(`Rule ${rule.id} exceeds the active rules limit for Pro user ${user.id}. Skipped.`);
              continue;
            }
          }

          // 3. Check AI replies entitlement
          if (rule.use_ai && plan !== "pro" && plan !== "business") {
            console.warn(`User ${user.id} does not have AI features on plan ${plan}. Rule ${rule.id} skipped.`);
            continue;
          }

          if (!platform.fetchComments) {
            console.warn(`Platform ${rule.platform} does not support fetching comments. Rule ${rule.id} skipped.`);
            continue;
          }

          const decryptedToken = decryptToken(rule.account.access_token);
          if (!decryptedToken) {
            console.error(`Failed to decrypt token for rule ${rule.id}`);
            continue;
          }

          // 2. Fetch recent posts for this account from our DB
          const recentResults = await db
            .select({
              platformPostId: post_platform_results.platform_post_id,
              postId: post_platform_results.post_id,
              postContent: posts.content,
            })
            .from(post_platform_results)
            .innerJoin(posts, eq(post_platform_results.post_id, posts.id))
            .where(
              and(
                eq(post_platform_results.account_id, rule.account_id),
                eq(post_platform_results.status, "published")
              )
            )
            .orderBy(desc(posts.published_at))
            .limit(10);

          for (const res of recentResults) {
            if (!res.platformPostId) continue;

            // 3. Fetch comments from platform API
            const comments = await platform.fetchComments(decryptedToken, res.platformPostId);

            for (const comment of comments) {
              // 4. Check if already replied or currently processing (Fast path for processed comments)
              const existingLog = await db.query.auto_reply_logs.findFirst({
                where: eq(auto_reply_logs.comment_id, comment.id),
              });

              if (existingLog && (existingLog.status === "success" || existingLog.status === "processing")) {
                continue;
              }

              // 5. Match against rule
              let matched = false;
              if (rule.trigger_type === "any") {
                matched = true;
              } else if (rule.trigger_type === "keyword" && rule.keywords) {
                const commentLower = comment.text.toLowerCase();
                matched = rule.keywords.some((kw) => commentLower.includes(kw.toLowerCase()));
              }

              if (matched) {
                console.log(`Matched comment ${comment.id} for rule ${rule.id}`);
                
                try {
                  if (existingLog && existingLog.status === "failed") {
                    // Transition reservation atomically from failed to processing
                    const updated = await db
                      .update(auto_reply_logs)
                      .set({
                        status: "processing",
                        rule_id: rule.id,
                        comment_text: comment.text,
                        reply_sent: null,
                        error: null,
                        created_at: new Date(),
                      })
                      .where(
                        and(
                          eq(auto_reply_logs.id, existingLog.id),
                          eq(auto_reply_logs.status, "failed")
                        )
                      )
                      .returning();

                    if (updated.length === 0) {
                      console.log(`Failed log for comment ${comment.id} already claimed/transitioned by another rule.`);
                      continue;
                    }
                  } else {
                    // 6. Reserve the comment atomically before enqueueing
                    // This prevents multiple rules from enqueueing the same comment
                    await db.insert(auto_reply_logs).values({
                      rule_id: rule.id,
                      comment_id: comment.id,
                      comment_text: comment.text,
                      status: "processing",
                    });
                  }

                  // 7. Enqueue the autoReplierQueue job directly
                  console.log(`Enqueueing auto-replier job for comment ${comment.id} directly`);
                  await autoReplierQueue.add("send-reply", {
                    ruleId: rule.id,
                    commentId: comment.id,
                    commentText: comment.text,
                    platformPostId: res.platformPostId,
                    postContent: res.postContent,
                  });
                  console.log(`Successfully enqueued auto-replier job for comment ${comment.id}`);
                } catch (error: any) {
                  // If it's a unique constraint violation (code 23505 for Postgres), 
                  // it means another rule or worker pass already claimed this comment.
                  if (error.code === "23505") {
                    console.log(`Comment ${comment.id} already reserved by another rule.`);
                    continue;
                  }
                  throw error;
                }
              }
            }
          }
        } catch (error: any) {
          console.error(`Error processing rule ${rule.id}:`, error);
          if (isRetryableError(error)) {
            retryableErrors.push(error);
          }
        }
      }

      if (retryableErrors.length > 0) {
        throw new Error(`Comment watcher job failed with ${retryableErrors.length} retryable errors. First error: ${retryableErrors[0].message}`);
      }
    } catch (error) {
      console.error("Comment watcher error:", error);
      throw error;
    }
  },
  { connection: redis }
);

commentWatcherWorker.on("completed", (job) => {
  console.log(`Comment Watcher Job ${job.id} completed successfully`);
});

commentWatcherWorker.on("failed", async (job, err) => {
  console.error(`Comment Watcher Job ${job?.id} failed:`, err);
  await handleJobFailure(job, err);
});
