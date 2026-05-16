import { Queue } from "bullmq";
import { redis } from "./redis";
import { TOKEN_REFRESHER_QUEUE } from "./jobs/token-refresher";

export const tokenRefresherQueue = new Queue(TOKEN_REFRESHER_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  },
});

// Schedule the token refresher to run every 6 hours
export async function scheduleTokenRefresh() {
  await tokenRefresherQueue.add(
    "refresh-all-tokens",
    {},
    {
      repeat: {
        pattern: "0 */6 * * *", // Every 6 hours
      },
      jobId: "refresh-all-tokens-job",
    }
  );
}
