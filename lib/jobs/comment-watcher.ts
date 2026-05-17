import { Worker, Job } from "bullmq";
import { redis } from "../redis";
import { db } from "../db";
import { auto_reply_rules, auto_reply_logs, post_platform_results } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "../platforms";
import { decryptToken } from "../encryption";
import { autoReplierQueue, COMMENT_WATCHER_QUEUE } from "../queue";

export const commentWatcherWorker = new Worker(
  COMMENT_WATCHER_QUEUE,
  async (job: Job) => {
    console.log("Running comment watcher...");

    try {
      // 1. Fetch all active rules
      const activeRules = await db.query.auto_reply_rules.findMany({
        where: eq(auto_reply_rules.is_active, true),
        with: {
          account: true,
        },
      });

      for (const rule of activeRules) {
        try {
          const platform = PLATFORMS[rule.platform as PlatformId];
          if (!platform || !rule.account) {
            console.error(`Missing platform or account for rule ${rule.id}`);
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
            })
            .from(post_platform_results)
            .where(
              and(
                eq(post_platform_results.account_id, rule.account_id),
                eq(post_platform_results.status, "published")
              )
            )
            .limit(10);

          for (const res of recentResults) {
            if (!res.platformPostId) continue;

            // 3. Fetch comments from platform API
            const comments = await platform.fetchComments(decryptedToken, res.platformPostId);

            for (const comment of comments) {
              // 4. Check if already replied (Fast path for processed comments)
              const existingLog = await db.query.auto_reply_logs.findFirst({
                where: eq(auto_reply_logs.comment_id, comment.id),
              });

              if (existingLog) continue;

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
                  // 6. Reserve the comment atomically before enqueueing
                  // This prevents multiple rules from enqueueing the same comment
                  await db.insert(auto_reply_logs).values({
                    rule_id: rule.id,
                    comment_id: comment.id,
                    comment_text: comment.text,
                  });

                  // 7. Enqueue reply job
                  await autoReplierQueue.add("send-reply", {
                    ruleId: rule.id,
                    commentId: comment.id,
                    commentText: comment.text,
                    platformPostId: res.platformPostId,
                  });
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
        } catch (error) {
          console.error(`Error processing rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Comment watcher error:", error);
    }
  },
  { connection: redis }
);
