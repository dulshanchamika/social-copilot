import { NextResponse } from "next/server";
import { scheduleTokenRefresh, scheduleCommentWatcher, scheduleAnalyticsSyncer } from "@/lib/queue";

export async function POST() {
  try {
    console.log("API/Workers/Start endpoint called. Bootstrapping repeatable jobs...");
    
    // Register repeatable jobs
    await scheduleTokenRefresh();
    await scheduleCommentWatcher();
    await scheduleAnalyticsSyncer();
    
    console.log("Repeatable jobs successfully registered via API route.");
    return NextResponse.json({ success: true, message: "Repeatable jobs bootstrapped." });
  } catch (error: any) {
    console.error("Failed to bootstrap repeatable jobs via API route:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
