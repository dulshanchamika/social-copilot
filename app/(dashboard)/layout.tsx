import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, social_accounts } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch user from our DB
  const user = await db.query.users.findFirst({
    where: eq(users.clerk_id, clerkId),
  });

  let isConnected: boolean | undefined = undefined;
  let plan: string | undefined = undefined;

  if (user) {
    plan = user.plan;
    const accountsCount = await db
      .select({ value: count() })
      .from(social_accounts)
      .where(eq(social_accounts.user_id, user.id));
    
    isConnected = (accountsCount[0]?.value || 0) > 0;
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardSidebar isConnected={isConnected} plan={plan} />
        <SidebarInset>
          <DashboardTopbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
