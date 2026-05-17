export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Bootstrapping background jobs...");
    const { scheduleTokenRefresh, scheduleCommentWatcher } = await import("./lib/queue");
    await import("./lib/jobs/token-refresher");
    await import("./lib/jobs/post-publisher");
    await import("./lib/jobs/comment-watcher");
    await import("./lib/jobs/auto-replier");

    await scheduleTokenRefresh();
    await scheduleCommentWatcher();
    console.log("Background jobs bootstrapped.");
  }
}
