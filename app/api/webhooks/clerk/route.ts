import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, auto_reply_rules } from "@/lib/db/schema";

import { eq, and } from "drizzle-orm";

// Explicit mapping from known Clerk plan identifiers/slugs to local plan values.
const CLERK_PLAN_MAP: Record<string, "free" | "pro" | "business"> = {
  "free": "free",
  "free-plan": "free",
  "free_plan": "free",
  "free basic": "free",
  "free-basic": "free",
  "pro": "pro",
  "pro-plan": "pro",
  "pro_plan": "pro",
  "business": "business",
  "business-plan": "business",
  "business_plan": "business",
  "biz": "business",
};

async function reconcileAutoReplyRules(clerkUserId: string, plan: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerk_id, clerkUserId),
  });

  if (!user) return;

  if (plan === "free") {
    // Disable all rules when the user becomes free
    await db.update(auto_reply_rules)
      .set({ is_active: false })
      .where(eq(auto_reply_rules.user_id, user.id));
  } else if (plan === "pro") {
    // Deactivate excess active rules when the user is downgraded to pro
    const activeRules = await db.query.auto_reply_rules.findMany({
      where: and(
        eq(auto_reply_rules.user_id, user.id),
        eq(auto_reply_rules.is_active, true)
      ),
      orderBy: (auto_reply_rules, { asc }) => [asc(auto_reply_rules.id)],
    });

    if (activeRules.length > 5) {
      const excessRules = activeRules.slice(5);
      for (const rule of excessRules) {
        await db.update(auto_reply_rules)
          .set({ is_active: false })
          .where(eq(auto_reply_rules.id, rule.id));
      }
    }
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  const eventType = evt.type as string;

  if (eventType === "user.created") {
    const { id, email_addresses } = evt.data as any;
    const email = email_addresses?.[0]?.email_address;

    if (!id || !email) {
      return new Response("Error occured -- missing data", { status: 400 });
    }

    try {
      await db.insert(users).values({
        clerk_id: id,
        email: email,
        plan: "free",
      }).onConflictDoNothing();
    } catch (error) {
      console.error("Error inserting user:", error);
      return new Response("Error inserting user", { status: 500 });
    }
  } else if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const subscription = evt.data as any;
    const clerkUserId = subscription.payer_id || subscription.user_id;

    if (!clerkUserId) {
      return new Response("Error occured -- missing user or payer ID", { status: 400 });
    }

    // Extract the plan slug
    const items = subscription.subscription_items || subscription.items || [];
    const planSlug = items[0]?.plan?.slug || items[0]?.plan?.name || "";
    
    if (!planSlug) {
      console.error("Webhook payload is missing a plan slug or name in subscription items.");
      return new Response("Error: Missing plan identifier", { status: 400 });
    }

    const resolvedPlan = CLERK_PLAN_MAP[planSlug.toLowerCase()];
    if (!resolvedPlan) {
      console.error(`Unrecognized Clerk plan identifier/slug: "${planSlug}". Leaving existing stored plan unchanged.`);
      return new Response("Error: Unrecognized plan identifier", { status: 400 });
    }

    const plan = resolvedPlan;

    try {
      await db.update(users)
        .set({ plan })
        .where(eq(users.clerk_id, clerkUserId));
      
      await reconcileAutoReplyRules(clerkUserId, plan);
    } catch (error) {
      console.error("Error updating user plan:", error);
      return new Response("Error updating user plan", { status: 500 });
    }
  } else if (eventType === "subscription.deleted") {
    const subscription = evt.data as any;
    const clerkUserId = subscription.payer_id || subscription.user_id;

    if (!clerkUserId) {
      return new Response("Error occured -- missing user or payer ID", { status: 400 });
    }

    try {
      await db.update(users)
        .set({ plan: "free" })
        .where(eq(users.clerk_id, clerkUserId));
      
      await reconcileAutoReplyRules(clerkUserId, "free");
    } catch (error) {
      console.error("Error deleting user subscription:", error);
      return new Response("Error deleting user subscription", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}
