import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { social_accounts, users } from "@/lib/db/schema";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { encryptToken } from "@/lib/encryption";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const config = PLATFORMS[platform as PlatformId];
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=missing_code", request.url));
  }

  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=not_configured", request.url));
  }

  const cookieStore = await cookies();
  const cookieName = `oauth_state_${platform}`;
  const storedStateCookie = cookieStore.get(cookieName);

  if (!storedStateCookie) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=missing_state", request.url));
  }

  cookieStore.delete(cookieName);

  let storedData;
  try {
    storedData = JSON.parse(storedStateCookie.value);
  } catch (e) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=invalid_state", request.url));
  }

  if (state !== storedData.state) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=state_mismatch", request.url));
  }

  const { userId: authUserId } = await auth();
  if (!authUserId || authUserId !== storedData.userId) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=unauthorized", request.url));
  }

  try {
    // 1. Get our internal user ID from the Clerk userId stored in the cookie
    const [user] = await db.select().from(users).where(eq(users.clerk_id, storedData.userId));
    if (!user) {
      return NextResponse.redirect(new URL("/dashboard/accounts?error=user_not_found", request.url));
    }

    // 2. Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oauth/${platform}/callback`;
    
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        ...(platform === "x" && storedData.codeVerifier ? { code_verifier: storedData.codeVerifier } : {}),
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error(`Token exchange failed for ${platform}:`, errorData);
      return NextResponse.redirect(new URL(`/dashboard/accounts?error=token_exchange_failed&platform=${platform}`, request.url));
    }

    const tokens = await tokenResponse.json();
    
    // 3. Get account info
    let accountName = "Social Account";
    let avatarUrl = null;

    try {
      if (platform === "x") {
        const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.data?.name || accountName;
          avatarUrl = profile.data?.profile_image_url || avatarUrl;
        }
      } else if (platform === "discord") {
        const profileRes = await fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.username || accountName;
          avatarUrl = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : avatarUrl;
        }
      } else if (platform === "youtube") {
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.name || accountName;
          avatarUrl = profile.picture || avatarUrl;
        }
      } else if (platform === "facebook" || platform === "instagram") {
        const profileRes = await fetch(`https://graph.facebook.com/v12.0/me?fields=name,picture&access_token=${tokens.access_token}`);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.name || accountName;
          avatarUrl = profile.picture?.data?.url || avatarUrl;
        }
      } else if (platform === "slack") {
        const profileRes = await fetch("https://slack.com/api/users.identity", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.user?.name || accountName;
          avatarUrl = profile.user?.image_192 || avatarUrl;
        }
      } else if (platform === "linkedin") {
        const profileRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.localizedFirstName ? `${profile.localizedFirstName} ${profile.localizedLastName}` : accountName;
        }
      } else if (platform === "tiktok") {
        const profileRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.data?.user?.display_name || accountName;
          avatarUrl = profile.data?.user?.avatar_url || avatarUrl;
        }
      } else if (platform === "pinterest") {
        const profileRes = await fetch("https://api.pinterest.com/v5/user_account", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.username || accountName;
          avatarUrl = profile.profile_image || avatarUrl;
        }
      }
    } catch (e) {
      console.error(`Failed to fetch profile for ${platform}:`, e);
    }

    // 4. Store in database
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000) 
      : null;

    // Check if account already exists
    const existing = await db
      .select()
      .from(social_accounts)
      .where(
        and(
          eq(social_accounts.user_id, user.id),
          eq(social_accounts.platform, platform)
        )
      );

    if (existing.length > 0) {
      await db
        .update(social_accounts)
        .set({
          access_token: encryptToken(tokens.access_token),
          refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing[0].refresh_token,
          expires_at: expiresAt,
        } as any)
        .where(eq(social_accounts.id, existing[0].id));
    } else {
      await db.insert(social_accounts).values({
        user_id: user.id,
        platform,
        access_token: encryptToken(tokens.access_token) as string,
        refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        account_name: accountName,
        avatar_url: avatarUrl,
        expires_at: expiresAt,
      });
    }

    return NextResponse.redirect(new URL("/dashboard/accounts?success=true", request.url));
  } catch (error) {
    console.error(`OAuth callback error for ${platform}:`, error);
    return NextResponse.redirect(new URL("/dashboard/accounts?error=internal_error", request.url));
  }
}
