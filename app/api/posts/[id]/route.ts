import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, users, social_accounts } from "@/lib/db/schema";
import { postPublisherQueue } from "@/lib/queue";
import { eq, and, inArray } from "drizzle-orm";
import { publishPost } from "@/lib/services/post-service";

import { PLATFORMS, PlatformId } from "@/lib/platforms";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.user_id, user.id)),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content, accountIds, mediaUrls, scheduledAt, isDraft } = body;

    let platforms: string[] | undefined;

    // Validate that every requested account is owned by this user — only when accountIds is being updated
    if (accountIds && accountIds.length > 0) {
      const connectedAccounts = await db
        .select()
        .from(social_accounts)
        .where(
          and(
            eq(social_accounts.user_id, user.id),
            inArray(social_accounts.id, accountIds)
          )
        );

      if (connectedAccounts.length !== accountIds.length) {
        return NextResponse.json(
          { error: "One or more selected accounts are invalid or not connected" },
          { status: 422 }
        );
      }
      platforms = connectedAccounts.map(a => a.platform);
      
      const unsupportedPlatforms = platforms.filter(
        (p) => !PLATFORMS[p as PlatformId]?.canPublish
      );
      if (unsupportedPlatforms.length > 0) {
        return NextResponse.json(
          { error: `Platform(s) not supported for publishing: ${unsupportedPlatforms.join(", ")}` },
          { status: 422 }
        );
      }
    }

    let status = post.status;
    const isFutureScheduled = !!(scheduledAt && new Date(scheduledAt) > new Date());

    if (isDraft) {
      status = "draft";
    } else if (scheduledAt || status === "draft") {
      status = "scheduled";
    }

    // Check plan limits if transitioning from draft to published/scheduled
    if (post.status === "draft" && status !== "draft") {
      const { canCreatePost } = await import("@/lib/plan-gates");
      if (!(await canCreatePost(user.id))) {
        return NextResponse.json({ error: "upgrade_required", feature: "post_composer" }, { status: 403 });
      }
    }

    // Determine if we are doing an immediate publish (not draft, and no future date)
    const isImmediatePublish = !isDraft && !isFutureScheduled;

    const updatedPostInsert = await db.update(posts).set({
      content: content || post.content,
      platforms: platforms || post.platforms,
      account_ids: accountIds || post.account_ids,
      media_urls: mediaUrls || post.media_urls,
      status,
      // Clear scheduled_at if publishing immediately, otherwise update or preserve
      scheduled_at: isImmediatePublish ? null : (scheduledAt ? new Date(scheduledAt) : post.scheduled_at),
    })
    .where(eq(posts.id, id))
    .returning();

    let updatedPost = updatedPostInsert[0];

    // If previously scheduled, try to remove old job
    try {
      const removed = await postPublisherQueue.remove(`post_${id}`);
      if (removed === 0) {
        console.warn(`Could not remove job post_${id} during update. It might be already running or completed.`);
      }
    } catch (e) {
      console.error(`Error removing job post_${id} during update:`, e);
    }

    if (!isDraft) {
      if (isFutureScheduled) {
        const delayMs = new Date(scheduledAt!).getTime() - Date.now();
        await postPublisherQueue.add(
          "publish-post",
          { postId: id },
          {
            delay: Math.max(0, delayMs),
            jobId: `post_${id}`,
          }
        );
      } else {
        // Immediate publish
        updatedPost = await publishPost(id);
      }
    }

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.user_id, user.id)),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await db.delete(posts).where(eq(posts.id, id));

    try {
      await postPublisherQueue.remove(`post_${id}`);
    } catch (e) {
      // Ignored
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
