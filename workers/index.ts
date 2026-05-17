import Module from "module";

// Mock the 'server-only' module to allow running server-only code in standalone workers
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments as any);
};

import { loadEnvConfig } from "@next/env";

// Load environment variables exactly like Next.js does
loadEnvConfig(process.cwd());

async function startWorkers() {
  console.log("Starting BullMQ workers process...");

  // Dynamically import worker handlers and queue helper functions to ensure env vars are loaded first
  const { tokenRefresherWorker } = await import("../lib/jobs/token-refresher");
  const { postPublisherWorker } = await import("../lib/jobs/post-publisher");
  const { commentWatcherWorker } = await import("../lib/jobs/comment-watcher");
  const { autoReplierWorker } = await import("../lib/jobs/auto-replier");
  const { analyticsSyncerWorker } = await import("../lib/jobs/analytics-syncer");
  const { scheduleTokenRefresh, scheduleCommentWatcher, scheduleAnalyticsSyncer } = await import("../lib/queue");

  // Register repeatable jobs on startup
  try {
    console.log("Registering repeatable jobs...");
    await scheduleTokenRefresh();
    await scheduleCommentWatcher();
    await scheduleAnalyticsSyncer();
    console.log("Repeatable jobs successfully registered.");
  } catch (error) {
    console.error("Failed to register repeatable jobs on startup:", error);
  }

  console.log("Workers are listening for jobs...");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down workers gracefully...`);
    
    try {
      await Promise.all([
        tokenRefresherWorker.close(),
        postPublisherWorker.close(),
        commentWatcherWorker.close(),
        autoReplierWorker.close(),
        analyticsSyncerWorker.close(),
      ]);
      console.log("All workers closed successfully.");
    } catch (err) {
      console.error("Error closing workers:", err);
    }

    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startWorkers().catch((err) => {
  console.error("Failed to start worker process:", err);
  process.exit(1);
});
