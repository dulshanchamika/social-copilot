import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { social_accounts } from "@/lib/db/schema";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { lt, sql } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";

export const TOKEN_REFRESHER_QUEUE = "token-refresher";

export const tokenRefresherWorker = new Worker(
  TOKEN_REFRESHER_QUEUE,
  async (job: Job) => {
    console.log(`Starting token refresh job: ${job.id}`);

    // 1. Find tokens expiring in the next 12 hours
    const expiringSoon = await db
      .select()
      .from(social_accounts)
      .where(
        lt(social_accounts.expires_at, new Date(Date.now() + 12 * 60 * 60 * 1000))
      );

    console.log(`Found ${expiringSoon.length} tokens to refresh`);

    for (const account of expiringSoon) {
      const platform = account.platform as PlatformId;
      const config = PLATFORMS[platform];
      
      if (!account.refresh_token) {
        console.warn(`No refresh token for ${platform} account ${account.id}`);
        continue;
      }

      const plainRefreshToken = decryptToken(account.refresh_token);

      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        console.error(`OAuth credentials not found for ${platform}`);
        continue;
      }

      try {
        const response = await fetch(config.tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: plainRefreshToken as string,
            grant_type: "refresh_token",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh token for ${platform}: ${await response.text()}`);
        }

        const tokens = await response.json();
        
        const expiresAt = tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000) 
          : null;

        await db
          .update(social_accounts)
          .set({
            access_token: encryptToken(tokens.access_token),
            refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : account.refresh_token,
            expires_at: expiresAt,
          } as any)
          .where(sql`id = ${account.id}`);

        console.log(`Successfully refreshed token for ${platform} account ${account.id}`);
      } catch (error) {
        console.error(`Error refreshing token for ${platform} account ${account.id}:`, error);
      }
    }
  },
  { connection: redis }
);

tokenRefresherWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

tokenRefresherWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
