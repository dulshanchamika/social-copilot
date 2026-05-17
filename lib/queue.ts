import { Queue } from "bullmq";
import { redis } from "./redis";

export const TOKEN_REFRESHER_QUEUE = "token-refresher";
export const POST_PUBLISHER_QUEUE = "post-publisher";
export const COMMENT_WATCHER_QUEUE = "comment-watcher";
export const AUTO_REPLIER_QUEUE = "auto-replier";
export const ANALYTICS_SYNCER_QUEUE = "analytics-syncer";

const globalForQueues = global as unknown as { 
  tokenRefresherQueue: Queue;
  postPublisherQueue: Queue;
  commentWatcherQueue: Queue;
  autoReplierQueue: Queue;
  analyticsSyncerQueue: Queue;
};

export const tokenRefresherQueue = globalForQueues.tokenRefresherQueue || new Queue(TOKEN_REFRESHER_QUEUE, {
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

export const postPublisherQueue = globalForQueues.postPublisherQueue || new Queue(POST_PUBLISHER_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export const commentWatcherQueue = globalForQueues.commentWatcherQueue || new Queue(COMMENT_WATCHER_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

export const autoReplierQueue = globalForQueues.autoReplierQueue || new Queue(AUTO_REPLIER_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export const analyticsSyncerQueue = globalForQueues.analyticsSyncerQueue || new Queue(ANALYTICS_SYNCER_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForQueues.tokenRefresherQueue = tokenRefresherQueue;
  globalForQueues.postPublisherQueue = postPublisherQueue;
  globalForQueues.commentWatcherQueue = commentWatcherQueue;
  globalForQueues.autoReplierQueue = autoReplierQueue;
  globalForQueues.analyticsSyncerQueue = analyticsSyncerQueue;
}

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

export async function scheduleCommentWatcher() {
  await commentWatcherQueue.add(
    "watch-comments",
    {},
    {
      repeat: {
        pattern: "*/5 * * * *", // Every 5 minutes
      },
      jobId: "comment-watcher-job",
    }
  );
}

export async function scheduleAnalyticsSyncer() {
  await analyticsSyncerQueue.add(
    "sync-analytics",
    {},
    {
      repeat: {
        pattern: "*/30 * * * *", // Every 30 minutes
      },
      jobId: "analytics-syncer-job",
    }
  );
}
