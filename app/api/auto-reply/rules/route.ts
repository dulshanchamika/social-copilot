import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { auto_reply_rules, users, social_accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";

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

    const rules = await db.query.auto_reply_rules.findMany({
      where: eq(auto_reply_rules.user_id, user.id),
      with: {
        account: true,
      },
      orderBy: (auto_reply_rules, { desc }) => [desc(auto_reply_rules.id)],
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { 
      platform, 
      accountId, 
      triggerType, 
      keywords, 
      replyTemplate, 
      useAi, 
      tone,
      isActive 
    } = body;

    if (!accountId || !triggerType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate account ownership
    const account = await db.query.social_accounts.findFirst({
      where: and(
        eq(social_accounts.id, accountId),
        eq(social_accounts.user_id, user.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: "Invalid account" }, { status: 400 });
    }

    if (platform && platform !== account.platform) {
      return NextResponse.json({ error: "Platform mismatch" }, { status: 400 });
    }

    const actualPlatform = account.platform;

    // Validate platform support for auto-replies
    const platformConfig = PLATFORMS[actualPlatform as PlatformId];
    if (!platformConfig || !platformConfig.fetchComments || !platformConfig.postReply) {
      return NextResponse.json(
        { error: `Platform ${actualPlatform} does not support auto-replies yet.` },
        { status: 400 }
      );
    }

    const newRule = await db.insert(auto_reply_rules).values({
      user_id: user.id,
      platform: actualPlatform,
      account_id: accountId,
      trigger_type: triggerType,
      keywords: keywords || [],
      reply_template: replyTemplate,
      use_ai: !!useAi,
      tone: tone || null,
      is_active: isActive !== undefined ? isActive : true,
    }).returning();

    return NextResponse.json(newRule[0], { status: 201 });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
