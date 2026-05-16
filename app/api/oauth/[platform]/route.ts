import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { social_accounts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { decryptToken } from "@/lib/encryption";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { platform } = await params;

  try {
    // 1. Get our internal user ID
    const [user] = await db.select().from(users).where(eq(users.clerk_id, clerkUserId));
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // 2. Fetch the stored connection to get the token
    const [account] = await db
      .select()
      .from(social_accounts)
      .where(
        and(
          eq(social_accounts.user_id, user.id),
          eq(social_accounts.platform, platform)
        )
      );

    if (!account) {
      return new NextResponse(null, { status: 204 });
    }

    // 3. Revoke the token if supported by the platform
    const config = PLATFORMS[platform as PlatformId];
    if (config?.revokeToken) {
      const accessToken = decryptToken(account.access_token);
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

      if (accessToken) {
        try {
          await config.revokeToken(accessToken, clientId || "", clientSecret || "");
        } catch (revokeError) {
          console.error(`Failed to revoke token for ${platform}:`, revokeError);
          // Continue to delete the local record even if revocation fails
        }
      }
    }

    // 4. Delete the connection
    await db
      .delete(social_accounts)
      .where(eq(social_accounts.id, account.id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error disconnecting ${platform}:`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
