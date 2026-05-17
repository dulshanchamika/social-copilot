export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Bootstrapping background jobs...");
    const { scheduleTokenRefresh, scheduleCommentWatcher, scheduleAnalyticsSyncer } = await import("./lib/queue");
    await import("./lib/jobs/token-refresher");
    await import("./lib/jobs/post-publisher");
    await import("./lib/jobs/comment-watcher");
    await import("./lib/jobs/auto-replier");
    await import("./lib/jobs/analytics-syncer");

    await scheduleTokenRefresh();
    await scheduleCommentWatcher();
    await scheduleAnalyticsSyncer();
    console.log("Background jobs bootstrapped.");
  }
}
