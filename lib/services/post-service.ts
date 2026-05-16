import { db } from "@/lib/db";
import { posts, post_platform_results, social_accounts } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { decryptToken } from "@/lib/encryption";

export async function publishPost(postId: string) {
  // Fetch the post
  const postRecord = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!postRecord) {
    throw new Error(`Post ${postId} not found`);
  }

  // If already published, just return it
  if (postRecord.status === "published") {
    return postRecord;
  }

  // Fetch user's social accounts for the selected accounts
  const accounts = await db.query.social_accounts.findMany({
    where: and(
      eq(social_accounts.user_id, postRecord.user_id),
      inArray(social_accounts.id, postRecord.account_ids)
    )
  });

  if (accounts.length === 0) {
    const [updatedPost] = await db.update(posts)
      .set({ status: "failed" })
      .where(eq(posts.id, postId))
      .returning();
    
    // Also record results for each account as failed
    for (let i = 0; i < postRecord.account_ids.length; i++) {
      const accountId = postRecord.account_ids[i];
      const platform = postRecord.platforms[i] || "unknown";
      await db.insert(post_platform_results).values({
        post_id: postId,
        account_id: accountId,
        platform,
        status: "failed",
        error: "Social account not found",
      });
    }
    
    return updatedPost;
  }

  let allSuccess = true;

  for (const accountId of postRecord.account_ids) {
    const account = accounts.find(a => a.id === accountId);
    
    let status: string = "failed";
    let errorMsg: string = "Account not connected";
    let platformPostId: string | null = null;
    let platform = "unknown";

    if (account) {
      platform = account.platform;
      try {
        const accessToken = decryptToken(account.access_token);
        if (!accessToken) throw new Error("Failed to decrypt access token");

        const pId = account.platform as PlatformId;
        const config = PLATFORMS[pId];
        if (!config) throw new Error(`Unknown platform: ${account.platform}`);
        if (!config.canPublish) {
          throw new Error(`${account.platform} publishing is not yet implemented`);
        }

        console.log(`Publishing to ${account.platform} (Account: ${account.id}) for post ${postId}`);
        platformPostId = await config.publish(accessToken, postRecord.content, postRecord.media_urls ?? []);
        status = "published";

      } catch (e: any) {
        allSuccess = false;
        status = "failed";
        errorMsg = e.message || "Unknown error";
        console.error(`Failed to publish post ${postId} to ${account.platform}:`, e);
      }
    } else {
      allSuccess = false;
    }

    const existingResult = await db.query.post_platform_results.findFirst({
      where: and(
        eq(post_platform_results.post_id, postId),
        eq(post_platform_results.account_id, accountId)
      )
    });

    if (existingResult) {
      await db.update(post_platform_results)
        .set({ 
          status, 
          error: status === "failed" ? errorMsg : null, 
          platform_post_id: platformPostId,
          platform // Ensure platform name is updated if needed
        })
        .where(eq(post_platform_results.id, existingResult.id));
    } else {
      await db.insert(post_platform_results).values({
        post_id: postId,
        account_id: accountId,
        platform,
        status,
        error: status === "failed" ? errorMsg : null,
        platform_post_id: platformPostId,
      });
    }
  }

  const updatedStatus = allSuccess ? "published" : "failed";
  const publishedAt = allSuccess ? new Date() : null;

  const [updatedPost] = await db.update(posts)
    .set({ 
      status: updatedStatus,
      published_at: publishedAt
    })
    .where(eq(posts.id, postId))
    .returning();

  return updatedPost;
}
