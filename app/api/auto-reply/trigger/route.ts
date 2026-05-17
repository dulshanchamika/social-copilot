import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auto_reply_rules, auto_reply_logs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { autoReplierQueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  let commentId: string | undefined;
  try {
    const body = await req.json();
    commentId = body.commentId;
    const { ruleId, commentText, platformPostId, postContent } = body;

    if (!ruleId || !commentId || !commentText || !platformPostId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`Processing trigger reply for comment ${commentId} via enqueue...`);

    const rule = await db.query.auto_reply_rules.findFirst({
      where: eq(auto_reply_rules.id, ruleId),
      with: {
        user: true,
      },
    });

    if (!rule || !rule.is_active) {
      return NextResponse.json({ error: "Rule is inactive or missing" }, { status: 400 });
    }

    const existingLog = await db.query.auto_reply_logs.findFirst({
      where: eq(auto_reply_logs.comment_id, commentId),
    });

    if (existingLog && (existingLog.status === "success" || existingLog.status === "processing")) {
      return NextResponse.json({ error: "Comment is already processed or processing" }, { status: 400 });
    }

    if (existingLog && existingLog.status === "failed") {
      // Transition reservation atomically from failed to processing
      const updated = await db
        .update(auto_reply_logs)
        .set({
          status: "processing",
          rule_id: ruleId,
          comment_text: commentText,
          reply_sent: null,
          error: null,
          created_at: new Date(),
        })
        .where(
          and(
            eq(auto_reply_logs.id, existingLog.id),
            eq(auto_reply_logs.status, "failed")
          )
        )
        .returning();

      if (updated.length === 0) {
        return NextResponse.json({ error: "Failed log already claimed/transitioned by another rule" }, { status: 400 });
      }
    } else if (!existingLog) {
      try {
        await db.insert(auto_reply_logs).values({
          rule_id: ruleId,
          comment_id: commentId,
          comment_text: commentText,
          status: "processing",
        });
      } catch (error: any) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "Comment already reserved" }, { status: 400 });
        }
        throw error;
      }
    }

    // Enqueue the job in the BullMQ queue
    await autoReplierQueue.add("send-reply", {
      ruleId,
      commentId,
      commentText,
      platformPostId,
      postContent,
    });

    console.log(`Successfully enqueued reply job for comment ${commentId}`);

    return NextResponse.json({
      success: true,
      message: "Auto-reply job enqueued successfully",
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
