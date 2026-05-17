export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const globalForWorkers = global as unknown as {
      workerProcessStarted: boolean;
      bootstrapCalled: boolean;
    };

    // 1. Start the standalone worker process in development
    if (process.env.NODE_ENV === "development") {
      if (!globalForWorkers.workerProcessStarted) {
        globalForWorkers.workerProcessStarted = true;
        
        const { spawn } = await import("child_process");
        const path = await import("path");

        console.log("[Instrumentation] Starting standalone BullMQ worker process in development...");
        
        const workerPath = path.resolve(process.cwd(), "workers/index.ts");
        
        // Spawn the worker process running 'npx tsx workers/index.ts'
        const workerProcess = spawn("npx", ["tsx", workerPath], {
          stdio: "inherit",
          shell: true,
          env: {
            ...process.env,
          },
        });

        workerProcess.on("error", (err) => {
          console.error("[Instrumentation] Failed to start worker process in development:", err);
          globalForWorkers.workerProcessStarted = false;
        });

        workerProcess.on("exit", (code) => {
          console.log(`[Instrumentation] Worker process exited with code ${code}`);
          globalForWorkers.workerProcessStarted = false;
        });
      } else {
        console.log("[Instrumentation] Worker process is already running in development.");
      }
    }

    // 2. Call the internal route to bootstrap repeatable jobs once on app start
    if (!globalForBootstrap().bootstrapCalled) {
      globalForBootstrap().bootstrapCalled = true;

      const port = process.env.PORT || "3000";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
      
      console.log(`[Instrumentation] Scheduling bootstrap call to ${appUrl}/api/workers/start...`);

      setTimeout(async () => {
        try {
          const response = await fetch(`${appUrl}/api/workers/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (response.ok) {
            console.log("[Instrumentation] Successfully called start workers API route.");
          } else {
            console.error(`[Instrumentation] Start workers API route returned status: ${response.status}`);
            globalForBootstrap().bootstrapCalled = false; // Allow retry on next trigger if it failed
          }
        } catch (error) {
          console.error("[Instrumentation] Failed to call start workers API route:", error);
          globalForBootstrap().bootstrapCalled = false; // Allow retry on next trigger if it failed
        }
      }, 5000); // 5 seconds delay to allow Next.js server to start listening
    }
  }
}

function globalForBootstrap() {
  return global as unknown as { bootstrapCalled: boolean };
}
