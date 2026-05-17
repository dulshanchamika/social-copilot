import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { ANALYTICS_SYNCER_QUEUE, handleJobFailure } from "@/lib/queue";
import { db } from "@/lib/db";
import { post_platform_results, social_accounts, account_followers_history } from "@/lib/db/schema";
import { eq, inArray, and, gte } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { decryptToken } from "@/lib/encryption";
import { AnalyticsSyncerJobData } from "./types";

const globalForWorkers = global as unknown as { 
  analyticsSyncerWorker: Worker;
};

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

export const analyticsSyncerWorker = globalForWorkers.analyticsSyncerWorker || new Worker(
  ANALYTICS_SYNCER_QUEUE,
  async (job: Job<AnalyticsSyncerJobData>) => {
    console.log(`Starting analytics syncer job: ${job.id}`);
    const retryableErrors: any[] = [];

    // We fetch all published results that have a platform_post_id
    // In a real production system, you would paginate or filter by recently published posts (e.g. within last 30 days)
    const results = await db.query.post_platform_results.findMany({
      where: eq(post_platform_results.status, "published"),
    });

    const accountIds = [...new Set(results.map(r => r.account_id).filter((id): id is string => id !== null))];

    // Also fetch all social accounts (not just those with published posts) so we
    // can snapshot follower counts even for accounts that haven't published yet.
    const allAccounts = await db.query.social_accounts.findMany();
    const accounts = accountIds.length > 0
      ? await db.query.social_accounts.findMany({
          where: inArray(social_accounts.id, accountIds),
        })
      : [];
    const accountsMap = new Map(accounts.map(a => [a.id, a]));

    // ── 1. Sync per-post engagement metrics ──────────────────────────────────
    if (results.length === 0) {
      console.log("No published posts to sync analytics for.");
    } else {
      for (const result of results) {
        if (!result.platform_post_id || !result.account_id) continue;

        const account = accountsMap.get(result.account_id);
        if (!account) continue;

        const pId = account.platform as PlatformId;
        const config = PLATFORMS[pId];

        if (!config || !config.fetchAnalytics) {
          // Analytics not supported for this platform yet
          continue;
        }

        try {
          const accessToken = decryptToken(account.access_token);
          if (!accessToken) continue;

          const metrics = await config.fetchAnalytics(accessToken, result.platform_post_id);

          await db.update(post_platform_results)
            .set({
              likes: metrics.likes,
              comments: metrics.comments,
              shares: metrics.shares,
              reach: metrics.reach,
              engagement_rate: metrics.engagement_rate,
            })
            .where(eq(post_platform_results.id, result.id));

          console.log(`Successfully synced analytics for result ${result.id} (Platform: ${result.platform})`);
        } catch (error: any) {
          console.error(`Failed to sync analytics for result ${result.id}:`, error);
          if (isRetryableError(error)) {
            retryableErrors.push(error);
          }
        }
      }
    }

    // ── 2. Snapshot current follower counts (once per account per day) ────────
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    for (const account of allAccounts) {
      const pId = account.platform as PlatformId;
      const config = PLATFORMS[pId];

      if (!config?.fetchFollowerCount) continue;

      try {
        // Skip if we already recorded a snapshot today for this account
        const existing = await db.query.account_followers_history.findFirst({
          where: and(
            eq(account_followers_history.account_id, account.id),
            gte(account_followers_history.recorded_at, todayStart)
          ),
        });

        if (existing) {
          console.log(`Follower snapshot already recorded today for account ${account.id}. Skipping.`);
          continue;
        }

        const accessToken = decryptToken(account.access_token);
        if (!accessToken) continue;

        const followers = await config.fetchFollowerCount(accessToken);

        await db.insert(account_followers_history).values({
          account_id: account.id,
          followers,
        });

        console.log(`Recorded follower count (${followers}) for account ${account.id} (Platform: ${account.platform})`);
      } catch (error: any) {
        console.error(`Failed to snapshot follower count for account ${account.id}:`, error);
        if (isRetryableError(error)) {
          retryableErrors.push(error);
        }
      }
    }

    if (retryableErrors.length > 0) {
      throw new Error(`Analytics syncer job failed with ${retryableErrors.length} retryable errors. First error: ${retryableErrors[0].message}`);
    }

    console.log(`Analytics syncer job ${job.id} completed.`);
  },
  { connection: redis }
);

if (process.env.NODE_ENV !== "production") {
  globalForWorkers.analyticsSyncerWorker = analyticsSyncerWorker;
}

analyticsSyncerWorker.on("completed", (job) => {
  console.log(`Analytics Syncer Job ${job.id} completed successfully`);
});

analyticsSyncerWorker.on("failed", async (job, err) => {
  console.error(`Analytics Syncer Job ${job?.id} failed:`, err);
  await handleJobFailure(job, err);
});
