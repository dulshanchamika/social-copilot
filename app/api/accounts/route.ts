import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, social_accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { PLATFORMS, PlatformId } from "@/lib/platforms";

export async function GET() {
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

    const accounts = await db
      .select({
        id: social_accounts.id,
        platform: social_accounts.platform,
        account_name: social_accounts.account_name,
        avatar_url: social_accounts.avatar_url,
      })
      .from(social_accounts)
      .where(eq(social_accounts.user_id, user.id));

    // Filter out platforms that are not supported for publishing
    const supportedAccounts = accounts.filter(
      (acct) => PLATFORMS[acct.platform as PlatformId]?.canPublish
    );

    return NextResponse.json(supportedAccounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
