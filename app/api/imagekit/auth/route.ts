import { getUploadAuthParams } from "@imagekit/next/server";
import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.error("ImageKit auth error: Missing environment variables");
    return NextResponse.json(
      { error: "ImageKit configuration is missing on the server" },
      { status: 500 }
    );
  }

  try {
    const authParams = getUploadAuthParams({
      publicKey,
      privateKey,
    });
    return NextResponse.json(authParams);
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return NextResponse.json({ error: "Failed to generate auth parameters" }, { status: 500 });
  }
}
