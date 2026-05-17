import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auto_reply_rules, auto_reply_logs, post_platform_results } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { decryptToken } from "@/lib/encryption";
import { generateAutoReply } from "@/lib/services/ai-service";

export async function POST(req: NextRequest) {
  let commentId: string | undefined;
  try {
    const body = await req.json();
    commentId = body.commentId;
    const { ruleId, commentText, platformPostId, postContent } = body;

    if (!ruleId || !commentId || !commentText || !platformPostId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`Processing trigger reply for comment ${commentId}...`);

    const rule = await db.query.auto_reply_rules.findFirst({
      where: eq(auto_reply_rules.id, ruleId),
      with: {
        account: true,
        user: true,
      },
    });

    if (!rule || !rule.account || !rule.user || !rule.is_active) {
      return NextResponse.json({ error: "Rule is inactive, missing, or owner not found" }, { status: 400 });
    }

    // Plan entitlement check
    const plan = (rule.user.plan || "free").toLowerCase();
    if (plan === "free") {
      return NextResponse.json({ error: "Owner has no auto-reply entitlement (Free plan)" }, { status: 403 });
    }

    if (plan === "pro") {
      // Find all active rules of this user sorted by ID to see if this rule is within the first 5
      const activeRules = await db.query.auto_reply_rules.findMany({
        where: and(
          eq(auto_reply_rules.user_id, rule.user_id),
          eq(auto_reply_rules.is_active, true)
        ),
        orderBy: (auto_reply_rules, { asc }) => [asc(auto_reply_rules.id)],
      });
      const ruleIndex = activeRules.findIndex((r) => r.id === rule.id);
      if (ruleIndex === -1 || ruleIndex >= 5) {
        return NextResponse.json({ error: "Rule exceeds Pro active rules limit" }, { status: 403 });
      }
    }

    if (rule.use_ai && plan !== "pro" && plan !== "business") {
      return NextResponse.json({ error: "Owner does not have AI replies entitlement" }, { status: 403 });
    }

    const platform = PLATFORMS[rule.platform as PlatformId];
    if (!platform) {
      return NextResponse.json({ error: `Platform ${rule.platform} not found` }, { status: 400 });
    }

    if (!platform.postReply) {
      return NextResponse.json({ error: `Platform ${rule.platform} does not support posting replies` }, { status: 400 });
    }

    let replyText = "";
    if (rule.use_ai) {
      let resolvedPostContent = postContent;
      if (!resolvedPostContent) {
        const postResult = await db.query.post_platform_results.findFirst({
          where: eq(post_platform_results.platform_post_id, platformPostId),
          with: {
            post: true,
          },
        });
        resolvedPostContent = postResult?.post?.content || "";
      }
      replyText = await generateAutoReply(commentText, resolvedPostContent, rule.tone || "friendly");
    } else {
      replyText = rule.reply_template || "";
    }

    if (!replyText) {
      return NextResponse.json({ error: "No reply text generated" }, { status: 400 });
    }

    const decryptedToken = decryptToken(rule.account.access_token);
    if (!decryptedToken) {
      return NextResponse.json({ error: "Failed to decrypt access token" }, { status: 500 });
    }

    const platformReplyId = await platform.postReply(
      decryptedToken,
      platformPostId,
      commentId,
      replyText
    );

    // Update log with the sent reply text
    await db.update(auto_reply_logs)
      .set({ reply_sent: replyText, status: "success", error: null })
      .where(eq(auto_reply_logs.comment_id, commentId));

    console.log(`Successfully replied to comment ${commentId} with reply ${platformReplyId}`);

    return NextResponse.json({
      success: true,
      replyId: platformReplyId,
      replyText,
    });
  } catch (error: any) {
    console.error("Error in auto-reply trigger route:", error);
    if (commentId) {
      try {
        await db.update(auto_reply_logs)
          .set({ status: "failed", error: error.message || String(error) })
          .where(eq(auto_reply_logs.comment_id, commentId));
      } catch (dbErr) {
        console.error("Failed to update auto_reply_logs status to failed in trigger route:", dbErr);
      }
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
