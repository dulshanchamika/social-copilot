import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAnalyticsData } from "@/lib/services/analytics-service";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("from");
    const endDateParam = searchParams.get("to");

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // default to 30 days
    let endDate = new Date();

    if (startDateParam) startDate = new Date(startDateParam);
    if (endDateParam) endDate = new Date(endDateParam);

    if (user.plan === "free") {
      return NextResponse.json({
        error: "Analytics Locked",
        message: "Upgrade to Pro or Business to access full analytics",
        plan: "free"
      }, { status: 403 });
    }

    const data = await getAnalyticsData(user.id, startDate, endDate);

    return NextResponse.json({
      plan: user.plan,
      ...data,
    });
  } catch (error) {
    console.error("[ANALYTICS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

