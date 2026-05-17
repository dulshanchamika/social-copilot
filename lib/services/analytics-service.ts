import { db } from "@/lib/db";
import { posts, post_platform_results, social_accounts, account_followers_history } from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";

export async function getAnalyticsData(userId: string, startDate: Date, endDate: Date) {
  const postResults = await db
    .select({
      id: posts.id,
      content: posts.content,
      published_at: posts.published_at,
      platform: post_platform_results.platform,
      status: post_platform_results.status,
      likes: post_platform_results.likes,
      comments: post_platform_results.comments,
      shares: post_platform_results.shares,
      reach: post_platform_results.reach,
      engagement_rate: post_platform_results.engagement_rate,
    })
    .from(posts)
    .innerJoin(post_platform_results, eq(posts.id, post_platform_results.post_id))
    .where(
      and(
        eq(posts.user_id, userId),
        eq(post_platform_results.status, "published"),
        gte(posts.published_at, startDate),
        lte(posts.published_at, endDate)
      )
    );

  const totalPosts = postResults.length;
  const totalReach = postResults.reduce((acc, curr) => acc + (curr.reach || 0), 0);
  const avgEngagementRate = totalPosts > 0 
    ? postResults.reduce((acc, curr) => acc + (curr.engagement_rate || 0), 0) / totalPosts 
    : 0;

  // ── Compute newFollowers from persisted follower history ────────────────────
  // Fetch all social accounts that belong to this user.
  const userAccounts = await db.query.social_accounts.findMany({
    where: eq(social_accounts.user_id, userId),
  });

  const userAccountIds = userAccounts.map(a => a.id);

  let newFollowers: number | null = null;

  if (userAccountIds.length > 0) {
    // For each account, find the earliest snapshot at or after startDate and the
    // latest snapshot at or before endDate, then sum the deltas.
    let totalDelta = 0;
    let anyDataFound = false;

    for (const accountId of userAccountIds) {
      // Snapshot closest to (and at/before) period start
      const startSnapshots = await db.query.account_followers_history.findMany({
        where: and(
          eq(account_followers_history.account_id, accountId),
          lte(account_followers_history.recorded_at, startDate)
        ),
        // We want the most recent one before/at startDate
        orderBy: [asc(account_followers_history.recorded_at)],
      });

      // Snapshot closest to (and at/before) period end
      const endSnapshots = await db.query.account_followers_history.findMany({
        where: and(
          eq(account_followers_history.account_id, accountId),
          lte(account_followers_history.recorded_at, endDate)
        ),
        orderBy: [asc(account_followers_history.recorded_at)],
      });

      const startSnap = startSnapshots.at(-1);  // most recent before startDate
      const endSnap = endSnapshots.at(-1);       // most recent before/at endDate

      if (startSnap && endSnap && endSnap.id !== startSnap.id) {
        totalDelta += endSnap.followers - startSnap.followers;
        anyDataFound = true;
      } else if (!startSnap && endSnap) {
        // No baseline — treat the end count as new (first seen in this window)
        totalDelta += endSnap.followers;
        anyDataFound = true;
      }
    }

    if (anyDataFound) {
      newFollowers = totalDelta;
    }
  }

  const postsOverTimeMap: Record<string, any> = {};
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    postsOverTimeMap[dateStr] = { date: dateStr, total: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  postResults.forEach((post) => {
    if (!post.published_at) return;
    const dateStr = post.published_at.toISOString().split("T")[0];
    if (!postsOverTimeMap[dateStr]) {
       postsOverTimeMap[dateStr] = { date: dateStr, total: 0 };
    }
    
    if (!postsOverTimeMap[dateStr][post.platform]) {
      postsOverTimeMap[dateStr][post.platform] = 0;
    }
    postsOverTimeMap[dateStr][post.platform] += 1;
    postsOverTimeMap[dateStr].total += 1;
  });

  const postsOverTime = Object.values(postsOverTimeMap).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const platformEngagementMap: Record<string, { totalRate: number; count: number }> = {};
  postResults.forEach((post) => {
    if (!platformEngagementMap[post.platform]) {
      platformEngagementMap[post.platform] = { totalRate: 0, count: 0 };
    }
    platformEngagementMap[post.platform].totalRate += (post.engagement_rate || 0);
    platformEngagementMap[post.platform].count += 1;
  });

  const engagementByPlatform = Object.keys(platformEngagementMap).map((platform) => ({
    platform,
    engagementRate: platformEngagementMap[platform].count > 0 
      ? platformEngagementMap[platform].totalRate / platformEngagementMap[platform].count 
      : 0,
  }));

  const platformBreakdownMap: Record<string, number> = {};
  postResults.forEach((post) => {
    platformBreakdownMap[post.platform] = (platformBreakdownMap[post.platform] || 0) + 1;
  });
  
  const platformBreakdown = Object.keys(platformBreakdownMap).map((platform) => ({
    platform,
    value: platformBreakdownMap[platform],
  }));

  const topPerformingPosts = [...postResults]
    .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
    .slice(0, 10)
    .map(post => ({
      id: post.id,
      content: post.content,
      platform: post.platform,
      reach: post.reach || 0,
      likes: post.likes || 0,
      comments: post.comments || 0,
      engagementRate: post.engagement_rate || 0,
    }));

  return {
    overview: {
      totalPosts,
      totalReach,
      avgEngagementRate,
      // null means no follower-history data exists yet for this user
      newFollowers,
    },
    postsOverTime,
    engagementByPlatform,
    platformBreakdown,
    topPerformingPosts,
  };
}
