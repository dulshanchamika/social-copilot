import React from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { social_accounts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { PlatformCard } from "@/components/dashboard/platform-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { userId: clerkUserId } = await auth();
  const params = await searchParams;
  
  if (!clerkUserId) {
    return <div>Unauthorized</div>;
  }

  // 1. Get our internal user ID
  const [user] = await db.select().from(users).where(eq(users.clerk_id, clerkUserId));
  
  // 2. Fetch connected accounts
  const connectedAccounts = user 
    ? await db.select().from(social_accounts).where(eq(social_accounts.user_id, user.id))
    : [];

  const accountsMap = connectedAccounts.reduce((acc, account) => {
    acc[account.platform as PlatformId] = {
      id: account.id,
      account_name: account.account_name,
      avatar_url: account.avatar_url,
      expires_at: account.expires_at ? account.expires_at.toISOString() : null,
    };
    return acc;
  }, {} as Record<PlatformId, any>);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Connected Accounts</h2>
        <p className="text-muted-foreground">
          Manage your social media platform connections and account status.
        </p>
      </div>

      {params.success && (
        <Alert className="border-green-500/50 bg-green-500/5 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Account connected successfully!
          </AlertDescription>
        </Alert>
      )}

      {params.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {params.error === "token_exchange_failed" 
              ? `Failed to connect ${params.platform}. Please check your credentials.`
              : "An error occurred while connecting your account."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(PLATFORMS).map((platform) => (
          <PlatformCard 
            key={platform.id} 
            platform={{
              id: platform.id,
              name: platform.name,
              color: platform.color,
            }} 
            connectedAccount={accountsMap[platform.id]}
          />
        ))}
      </div>
    </div>
  );
}
