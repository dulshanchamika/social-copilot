import React from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, social_accounts, posts, auto_reply_rules } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_id, userId),
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch Connected Accounts Count
  const [accountsRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(social_accounts)
    .where(eq(social_accounts.user_id, user.id));
  const accountsCount = accountsRes?.count || 0;

  // Fetch Posts Count this month
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const startOfNextMonth = new Date(startOfMonth);
  startOfNextMonth.setUTCMonth(startOfMonth.getUTCMonth() + 1);

  const [postsRes] = await db
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
  const postsCount = postsRes?.count || 0;

  // Fetch Auto-Reply Rules Count
  const [rulesRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auto_reply_rules)
    .where(eq(auto_reply_rules.user_id, user.id));
  const rulesCount = rulesRes?.count || 0;

  // Fetch Clerk billing subscription and statement (invoice) history
  let subscription: any = null;
  let invoices: Array<{ id: string; date: string; amount: string; status: string }> = [];

  try {
    const client = await clerkClient();
    
    // Fetch active subscription
    try {
      subscription = await client.billing.getUserBillingSubscription(userId);
    } catch (subError: any) {
      if (subError?.status === 403 || subError?.statusCode === 403 || String(subError).includes("Forbidden") || subError?.message?.includes("Forbidden")) {
        console.warn("Clerk Billing is not enabled or forbidden (403) for this instance. Defaulting to free plan subscription.");
      } else {
        console.error("Error fetching Clerk subscription:", subError);
      }
    }

    // Fetch billing statements (invoices)
    try {
      const url = `https://api.clerk.com/v1/users/${userId}/billing/statements`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const statements = data.data || [];
        invoices = statements.map((stmt: any) => {
          let dateStr = "N/A";
          const dateVal = stmt.created_at || stmt.billing_date || stmt.period_start || stmt.updated_at;
          if (dateVal) {
            const dateObj = new Date(typeof dateVal === "number" ? dateVal : dateVal);
            dateStr = new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(dateObj);
          }
          
          let amountStr = "$0.00";
          if (stmt.totals?.grand_total?.amount_formatted) {
            amountStr = stmt.totals.grand_total.amount_formatted;
          } else if (stmt.amount?.amount_formatted) {
            amountStr = stmt.amount.amount_formatted;
          } else if (stmt.amount !== undefined) {
            amountStr = `$${(stmt.amount / 100).toFixed(2)}`;
          }
          
          let statusStr = "Unknown";
          if (stmt.status) {
            statusStr = stmt.status.charAt(0).toUpperCase() + stmt.status.slice(1);
          }
          
          return {
            id: stmt.id,
            date: dateStr,
            amount: amountStr,
            status: statusStr,
          };
        });
      } else if (res.status === 403) {
        console.warn(`Clerk Billing statements are not enabled or forbidden (403): ${res.status} ${res.statusText}`);
      } else {
        console.error(`Failed to fetch statements from Clerk: ${res.status} ${res.statusText}`);
      }
    } catch (stmtError: any) {
      if (stmtError?.status === 403 || stmtError?.statusCode === 403 || String(stmtError).includes("Forbidden") || stmtError?.message?.includes("Forbidden")) {
        console.warn("Clerk Billing statements are not enabled or forbidden (403) for this instance.");
      } else {
        console.error("Error fetching Clerk statements:", stmtError);
      }
    }
  } catch (clerkError) {
    console.error("Error initializing Clerk client or fetching billing details:", clerkError);
  }

  return (
    <BillingClient
      currentPlan={user.plan || "free"}
      accountsCount={accountsCount}
      postsCount={postsCount}
      rulesCount={rulesCount}
      subscription={subscription}
      invoices={invoices}
    />
  );
}

