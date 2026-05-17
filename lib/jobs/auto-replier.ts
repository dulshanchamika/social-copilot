import { Worker, Job } from "bullmq";
import { redis } from "../redis";
import { db } from "../db";
import { auto_reply_rules, auto_reply_logs } from "../db/schema";
import { eq } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "../platforms";
import { decryptToken } from "../encryption";
import { generateAutoReply } from "../services/ai-service";
import { AUTO_REPLIER_QUEUE } from "../queue";

export const autoReplierWorker = new Worker(
  AUTO_REPLIER_QUEUE,
  async (job: Job) => {
    const { ruleId, commentId, commentText, platformPostId } = job.data;
    console.log(`Processing reply for comment ${commentId}...`);

    try {
      const rule = await db.query.auto_reply_rules.findFirst({
        where: eq(auto_reply_rules.id, ruleId),
        with: {
          account: true,
        },
      });

      if (!rule || !rule.account || !rule.is_active) {
        console.log(`Rule ${ruleId} is no longer active or missing.`);
        return;
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
        replyText = await generateAutoReply(commentText, rule.tone || "friendly");
      } else {
        replyText = rule.reply_template || "";
      }

      if (!replyText) {
        console.log("No reply text generated.");
        return;
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
        .set({ reply_sent: replyText })
        .where(eq(auto_reply_logs.comment_id, commentId));

      console.log(`Successfully replied to comment ${commentId} with reply ${platformReplyId}`);
    } catch (error) {
      console.error(`Auto-replier error for rule ${ruleId}:`, error);
      throw error;
    }
  },
  { connection: redis }
);
