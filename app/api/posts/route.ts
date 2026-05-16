import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, users, social_accounts } from "@/lib/db/schema";
import { postPublisherQueue } from "@/lib/queue";
import { eq, and, inArray } from "drizzle-orm";
import { publishPost } from "@/lib/services/post-service";

import { PLATFORMS, PlatformId } from "@/lib/platforms";

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
    const { content, accountIds, mediaUrls, scheduledAt, isDraft } = body;

    if (!content || !accountIds || accountIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate that every requested account is owned by this user
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

    const platforms = connectedAccounts.map(a => a.platform);

    // Validate that platforms are supported
    const unsupportedPlatforms = (platforms as string[]).filter(
      (p) => !PLATFORMS[p as PlatformId]?.canPublish
    );
    if (unsupportedPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Platform(s) not supported for publishing: ${unsupportedPlatforms.join(", ")}` },
        { status: 422 }
      );
    }

    let status = "draft";
    const isFutureScheduled = scheduledAt && new Date(scheduledAt) > new Date();

    if (!isDraft) {
      status = "scheduled";
    }

    const postInsert = await db.insert(posts).values({
      user_id: user.id,
      content,
      platforms,
      account_ids: accountIds,
      media_urls: mediaUrls || [],
      status,
      scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
    }).returning();

    let post = postInsert[0];

    if (!isDraft) {
      if (isFutureScheduled) {
        const delayMs = new Date(scheduledAt!).getTime() - Date.now();
        await postPublisherQueue.add(
          "publish-post",
          { postId: post.id },
          {
            delay: Math.max(0, delayMs),
            jobId: `post_${post.id}`,
          }
        );
      } else {
        // Immediate publish
        post = await publishPost(post.id);
      }
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const allPosts = await db.query.posts.findMany({
      where: eq(posts.user_id, user.id),
      with: {
        platform_results: true,
      },
      limit,
      offset,
      orderBy: (posts, { desc }) => [desc(posts.id)],
    });

    return NextResponse.json(allPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
