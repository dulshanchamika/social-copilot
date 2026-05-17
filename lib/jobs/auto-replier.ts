import { Worker, Job } from "bullmq";
import { redis } from "../redis";
import { db } from "../db";
import { auto_reply_rules, auto_reply_logs, post_platform_results } from "../db/schema";
import { eq } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "../platforms";
import { decryptToken } from "../encryption";
import { generateAutoReply } from "../services/ai-service";
import { AUTO_REPLIER_QUEUE } from "../queue";

export const autoReplierWorker = new Worker(
  AUTO_REPLIER_QUEUE,
  async (job: Job) => {
    const { ruleId, commentId, commentText, platformPostId } = job.data;
    let postContent = job.data.postContent;
    console.log(`Processing reply for comment ${commentId}...`);

    try {
      const rule = await db.query.auto_reply_rules.findFirst({
        where: eq(auto_reply_rules.id, ruleId),
        with: {
          account: true,
        },
      });

      if (!rule || !rule.account || !rule.is_active) {
        throw new Error("Rule is no longer active or missing.");
      }

      const platform = PLATFORMS[rule.platform as PlatformId];
      if (!platform) {
        throw new Error(`Platform ${rule.platform} not found.`);
      }

      if (!platform.postReply) {
        throw new Error(`Platform ${rule.platform} does not support posting replies.`);
      }

      let replyText = "";
      if (rule.use_ai) {
        if (!postContent) {
          const postResult = await db.query.post_platform_results.findFirst({
            where: eq(post_platform_results.platform_post_id, platformPostId),
            with: {
              post: true,
            },
          });
          postContent = postResult?.post?.content || "";
        }
        replyText = await generateAutoReply(commentText, postContent, rule.tone || "friendly");
      } else {
        replyText = rule.reply_template || "";
      }

      if (!replyText) {
        throw new Error("No reply text generated.");
      }

      const decryptedToken = decryptToken(rule.account.access_token);
      if (!decryptedToken) {
        throw new Error("Failed to decrypt access token");
      }

      const platformReplyId = await platform.postReply(
        decryptedToken,
        platformPostId,
        commentId,
        replyText
      );

      await db.update(auto_reply_logs)
        .set({ reply_sent: replyText, status: "success", error: null })
        .where(eq(auto_reply_logs.comment_id, commentId));

      console.log(`Successfully replied to comment ${commentId} with reply ${platformReplyId}`);
    } catch (error: any) {
      console.error(`Auto-replier error for rule ${ruleId}:`, error);
      try {
        await db.update(auto_reply_logs)
          .set({ status: "failed", error: error.message || String(error) })
          .where(eq(auto_reply_logs.comment_id, commentId));
      } catch (dbErr) {
        console.error("Failed to update auto_reply_logs status to failed:", dbErr);
      }
      throw error;
    }
  },
  { connection: redis }
);
