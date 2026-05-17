import { db } from "@/lib/db";
import { users, social_accounts, posts, auto_reply_rules } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const PLAN_LIMITS = {
  free: {
    maxAccounts: 3,
    maxPostsPerMonth: 10,
    maxAutoReplyRules: 0,
    hasAI: false,
  },
  pro: {
    maxAccounts: 10,
    maxPostsPerMonth: Infinity,
    maxAutoReplyRules: 5,
    hasAI: true,
  },
  business: {
    maxAccounts: Infinity,
    maxPostsPerMonth: Infinity,
    maxAutoReplyRules: Infinity,
    hasAI: true,
  },
};

async function getUser(userId: string) {
  if (userId.startsWith("user_")) {
    return await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
    });
  } else {
    return await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }
}

export async function canConnectMoreAccounts(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;

  const plan = (user.plan || "free").toLowerCase() as "free" | "pro" | "business";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (limits.maxAccounts === Infinity) return true;

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(social_accounts)
    .where(eq(social_accounts.user_id, user.id));

  return (result?.count || 0) < limits.maxAccounts;
}

export async function canCreatePost(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;

  const plan = (user.plan || "free").toLowerCase() as "free" | "pro" | "business";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (limits.maxPostsPerMonth === Infinity) return true;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const startOfNextMonth = new Date(startOfMonth);
  startOfNextMonth.setUTCMonth(startOfMonth.getUTCMonth() + 1);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(
      and(
        eq(posts.user_id, user.id),
        sql`${posts.status} != 'draft' AND (
          (${posts.published_at} >= ${startOfMonth} AND ${posts.published_at} < ${startOfNextMonth}) OR 
          (${posts.scheduled_at} >= ${startOfMonth} AND ${posts.scheduled_at} < ${startOfNextMonth})
        )`
      )
    );

  return (result?.count || 0) < limits.maxPostsPerMonth;
}

export async function canCreateAutoReplyRule(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;

  const plan = (user.plan || "free").toLowerCase() as "free" | "pro" | "business";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (limits.maxAutoReplyRules === Infinity) return true;

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auto_reply_rules)
    .where(eq(auto_reply_rules.user_id, user.id));

  return (result?.count || 0) < limits.maxAutoReplyRules;
}

export async function hasAIFeatures(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;

  const plan = (user.plan || "free").toLowerCase() as "free" | "pro" | "business";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  return limits.hasAI;
}
