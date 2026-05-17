import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { auto_reply_logs, users, auto_reply_rules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch logs for rules belonging to this user
    const logs = await db
      .select({
        id: auto_reply_logs.id,
        comment_id: auto_reply_logs.comment_id,
        comment_text: auto_reply_logs.comment_text,
        reply_sent: auto_reply_logs.reply_sent,
        created_at: auto_reply_logs.created_at,
        platform: auto_reply_rules.platform,
      })
      .from(auto_reply_logs)
      .innerJoin(
        auto_reply_rules,
        eq(auto_reply_logs.rule_id, auto_reply_rules.id)
      )
      .where(eq(auto_reply_rules.user_id, user.id))
      .orderBy(desc(auto_reply_logs.created_at))
      .limit(50);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
