import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORMS[platform as PlatformId];

  if (!config) {
    return new NextResponse("Platform not supported", { status: 400 });
  }

  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
  if (!clientId) {
    return new NextResponse(`${platform} OAuth not configured`, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oauth/${platform}/callback`;
  
  const state = crypto.randomBytes(32).toString("hex");
  let codeVerifier: string | undefined;

  const searchParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: state,
  });

  // Handle platform-specific quirks
  if (platform === "x") {
    codeVerifier = crypto.randomBytes(32).toString("hex");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    searchParams.set("code_challenge", codeChallenge);
    searchParams.set("code_challenge_method", "S256");
  }

  const cookieStore = await cookies();
  cookieStore.set(`oauth_state_${platform}`, JSON.stringify({ state, userId, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
    path: "/",
  });

  const url = `${config.authUrl}?${searchParams.toString()}`;

  return NextResponse.redirect(url);
}
