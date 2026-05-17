import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { auto_reply_rules, users, social_accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    // Allowed fields from the UI contract
    const allowedFields = [
      "platform",
      "accountId",
      "triggerType",
      "keywords",
      "replyTemplate",
      "useAi",
      "tone",
      "isActive",
    ];

    // Reject unknown fields
    const bodyKeys = Object.keys(body);
    for (const key of bodyKeys) {
      if (!allowedFields.includes(key)) {
        return NextResponse.json({ error: `Unknown field: ${key}` }, { status: 400 });
      }
    }

    const existingRule = await db.query.auto_reply_rules.findFirst({
      where: and(
        eq(auto_reply_rules.id, id),
        eq(auto_reply_rules.user_id, user.id)
      ),
      with: {
        account: true,
      }
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    let account = existingRule.account;

    if (body.accountId !== undefined && body.accountId !== existingRule.account_id) {
      // Validate that the new account belongs to the current user
      const newAccount = await db.query.social_accounts.findFirst({
        where: and(
          eq(social_accounts.id, body.accountId),
          eq(social_accounts.user_id, user.id)
        ),
      });

      if (!newAccount) {
        return NextResponse.json({ error: "Invalid account or unauthorized" }, { status: 403 });
      }
      account = newAccount;
      updateData.account_id = account.id;
    }

    if (body.platform !== undefined && body.platform !== account.platform) {
      return NextResponse.json({ error: "Platform mismatch" }, { status: 400 });
    }

    // Always ensure the rule's platform is in sync with its account's platform 
    // when account changes or platform is explicitly requested
    if (updateData.account_id !== undefined || body.platform !== undefined) {
      const platformConfig = PLATFORMS[account.platform as PlatformId];
      if (!platformConfig || !platformConfig.fetchComments || !platformConfig.postReply) {
        return NextResponse.json(
          { error: `Platform ${account.platform} does not support auto-replies yet.` },
          { status: 400 }
        );
      }
      updateData.platform = account.platform;
    }

    if (body.triggerType !== undefined) updateData.trigger_type = body.triggerType;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.replyTemplate !== undefined) updateData.reply_template = body.replyTemplate;
    if (body.useAi !== undefined) updateData.use_ai = body.useAi;
    if (body.tone !== undefined) updateData.tone = body.tone;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    if (updateData.use_ai === true) {
      const { hasAIFeatures } = await import("@/lib/plan-gates");
      if (!(await hasAIFeatures(user.id))) {
        return NextResponse.json({ error: "upgrade_required", feature: "ai_replies" }, { status: 403 });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updatedRule = await db
      .update(auto_reply_rules)
      .set(updateData)
      .where(
        and(
          eq(auto_reply_rules.id, id),
          eq(auto_reply_rules.user_id, user.id)
        )
      )
      .returning();

    if (updatedRule.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRule[0]);
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const deletedRule = await db
      .delete(auto_reply_rules)
      .where(
        and(
          eq(auto_reply_rules.id, id),
          eq(auto_reply_rules.user_id, user.id)
        )
      )
      .returning();

    if (deletedRule.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
