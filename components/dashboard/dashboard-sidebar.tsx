"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Link2,
  PlusSquare,
  Calendar,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
  Zap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Connected Accounts",
    url: "/dashboard/accounts",
    icon: Link2,
    showStatus: true,
  },
  {
    title: "Compose Post",
    url: "/dashboard/compose",
    icon: PlusSquare,
  },
  {
    title: "Scheduled Posts",
    url: "/dashboard/scheduled",
    icon: Calendar,
  },
  {
    title: "Auto-Reply Rules",
    url: "/dashboard/auto-reply",
    icon: MessageSquare,
  },
];

const insightsNavItems = [
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
];

const accountNavItems = [
  {
    title: "Billing & Plans",
    url: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  isConnected?: boolean;
  plan?: string;
}

export function DashboardSidebar({ isConnected, plan, ...props }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Social Copilot</span>
                <span className="text-xs text-muted-foreground">AI Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      pathname === item.url && "text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    {item.showStatus && (
                      <div className="ml-auto flex items-center gap-1">
                        <div
                          className={cn(
                            "size-2 rounded-full",
                            isConnected === undefined
                              ? "bg-slate-300 animate-pulse"
                              : isConnected
                              ? "bg-green-500"
                              : "bg-red-500"
                          )}
                        />
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {insightsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      pathname === item.url && "text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      pathname === item.url && "text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="md:h-14 group-data-[collapsible=icon]:h-12"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                <AvatarFallback className="rounded-lg">
                  {user?.firstName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">
                  {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn("h-4 px-1 text-[10px] uppercase", !plan && "animate-pulse")}>
                    {plan || "Loading..."}
                  </Badge>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
