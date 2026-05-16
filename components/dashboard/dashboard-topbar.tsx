"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";

const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/accounts": "Connected Accounts",
  "/dashboard/compose": "Compose Post",
  "/dashboard/scheduled": "Scheduled Posts",
  "/dashboard/auto-reply": "Auto-Reply Rules",
  "/dashboard/analytics": "Analytics",
  "/dashboard/billing": "Billing & Plans",
  "/dashboard/settings": "Settings",
};

export function DashboardTopbar() {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "Dashboard";

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight md:text-xl">
          {title}
        </h1>
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/dashboard/compose" className="hidden sm:block">
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              <span>Compose Post</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
          </Button>
          <ModeToggle />
          <div className="flex items-center ml-2">
            {isMounted && <UserButton />}
          </div>
        </div>
      </div>
    </header>
  );
}
