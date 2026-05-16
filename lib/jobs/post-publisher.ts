import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { POST_PUBLISHER_QUEUE } from "@/lib/queue";
import { db } from "@/lib/db";
import { posts, post_platform_results, social_accounts } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { decryptToken } from "@/lib/encryption";


interface PublishJobData {
  postId: string;
}

const globalForWorkers = global as unknown as { 
  postPublisherWorker: Worker;
};

export const postPublisherWorker = globalForWorkers.postPublisherWorker || new Worker(
  POST_PUBLISHER_QUEUE,
  async (job: Job<PublishJobData>) => {
    const { postId } = job.data;
    console.log(`Starting post publisher job: ${job.id} for post ${postId}`);
    
    const postRecord = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!postRecord) throw new Error("Post not found");

    // Refuse to publish if not scheduled or if scheduled_at is in the future (stale job)
    if (postRecord.status !== "scheduled") {
      console.warn(`Aborting job ${job.id}: Post ${postId} status is '${postRecord.status}', expected 'scheduled'`);
      return;
    }

    if (postRecord.scheduled_at && new Date(postRecord.scheduled_at).getTime() > Date.now() + 1000) {
      console.warn(`Aborting job ${job.id}: Post ${postId} is rescheduled for ${postRecord.scheduled_at.toISOString()}`);
      return;
    }

    const targetAccountIds = postRecord.account_ids;
    const accounts = await db.query.social_accounts.findMany({
      where: and(
        eq(social_accounts.user_id, postRecord.user_id),
        inArray(social_accounts.id, targetAccountIds)
      ),
    });

    const results = await db.query.post_platform_results.findMany({
      where: eq(post_platform_results.post_id, postId),
    });

    const pendingAccountIds = targetAccountIds.filter(accountId => {
      const result = results.find(r => r.account_id === accountId);
      return result?.status !== "published";
    });

    // If all target accounts are already published, just ensure post status is correct and exit
    if (pendingAccountIds.length === 0) {
      await db.update(posts)
        .set({ status: "published", published_at: postRecord.published_at || new Date() })
        .where(eq(posts.id, postId));
      return;
    }

    for (const accountId of pendingAccountIds) {
      const account = accounts.find((a) => a.id === accountId);
      let status: "published" | "failed" = "failed";
      let errorMsg: string | null = null;
      let platformPostId: string | null = null;
      let platform = "unknown";

      if (account) {
        platform = account.platform;
        try {
          const accessToken = decryptToken(account.access_token);
          if (!accessToken) throw new Error("Failed to decrypt access token");

          const pId = account.platform as PlatformId;
          const config = PLATFORMS[pId];
          if (!config) throw new Error(`Unknown platform: ${account.platform}`);
          
          if (!config.canPublish) {
            throw new Error(`${account.platform} publishing is not yet implemented`);
          }

          console.log(`Publishing to ${account.platform} (Account: ${account.id}) for post ${postId}`);

          // Call the real publish handler
          platformPostId = await config.publish(accessToken, postRecord.content, postRecord.media_urls ?? []);
          status = "published";

        } catch (e: any) {
          status = "failed";
          errorMsg = e.message || "Unknown error";
          console.error(`Failed to publish post ${postId} to ${account.platform}:`, e);
        }
      } else {
        status = "failed";
        errorMsg = "Account not connected";
      }

      const existingResult = results.find(r => r.account_id === accountId);

      if (existingResult) {
        await db.update(post_platform_results)
          .set({ 
            status, 
            error: status === "failed" ? errorMsg : null, 
            platform_post_id: platformPostId,
            platform
          })
          .where(eq(post_platform_results.id, existingResult.id));
      } else {
        await db.insert(post_platform_results).values({
          post_id: postId,
          account_id: accountId,
          platform,
          status,
          error: status === "failed" ? errorMsg : null,
          platform_post_id: platformPostId,
        });
      }
    }

    // Refresh results to check final state
    const finalResults = await db.query.post_platform_results.findMany({
      where: eq(post_platform_results.post_id, postId),
    });

    const isFullyPublished = targetAccountIds.every(accountId => 
      finalResults.find(r => r.account_id === accountId)?.status === "published"
    );

    if (isFullyPublished) {
      await db.update(posts)
        .set({ 
          status: "published",
          published_at: new Date()
        })
        .where(eq(posts.id, postId));
      return;
    }

    // If we reach here, some platforms failed.
    const maxAttempts = job.opts.attempts || 1;
    const isLastAttempt = (job.attemptsMade + 1) >= maxAttempts;

    if (isLastAttempt) {
      await db.update(posts)
        .set({ status: "failed" })
        .where(eq(posts.id, postId));
    }

    // Throwing error triggers BullMQ retry if isLastAttempt is false
    throw new Error(`Publishing failed for some platforms. Attempt ${job.attemptsMade + 1} of ${maxAttempts}.`);
  },
  { connection: redis }
);

if (process.env.NODE_ENV !== "production") globalForWorkers.postPublisherWorker = postPublisherWorker;

postPublisherWorker.on("completed", (job) => {
  console.log(`Post Job ${job.id} completed successfully`);
});

postPublisherWorker.on("failed", (job, err) => {
  console.error(`Post Job ${job?.id} failed:`, err);
});
