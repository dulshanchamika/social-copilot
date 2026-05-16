export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Bootstrapping background jobs...");
    const { scheduleTokenRefresh } = await import("./lib/queue");
    await import("./lib/jobs/token-refresher");
    await import("./lib/jobs/post-publisher");

    await scheduleTokenRefresh();
    console.log("Background jobs bootstrapped.");
  }
}
