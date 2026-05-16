import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, posts, social_accounts, auto_reply_rules, auto_reply_logs } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  MessageSquare, 
  Send, 
  Users, 
  Plus,
  ArrowUpRight,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch user from our DB
  let user = await db.query.users.findFirst({
    where: eq(users.clerk_id, clerkId),
  });

  if (!user) {
    // Fallback: If user is not in DB, create them (resilience against webhook failure)
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) {
        await db.insert(users).values({
          clerk_id: clerkId,
          email: email,
          plan: "free",
        }).onConflictDoNothing();
        
        // Fetch again
        user = await db.query.users.findFirst({
          where: eq(users.clerk_id, clerkId),
        });
      }
    }
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Setting up your dashboard...</h2>
          <p className="text-muted-foreground">This should only take a moment.</p>
        </div>
      </div>
    );
  }

  // Fetch stats and data
  // In a real app, some of these might be aggregated or come from an analytics service
  const totalPosts = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.user_id, user.id));

  const connectedAccounts = await db.query.social_accounts.findMany({
    where: eq(social_accounts.user_id, user.id),
  });

  const recentPosts = await db.query.posts.findMany({
    where: eq(posts.user_id, user.id),
    orderBy: [desc(posts.scheduled_at)],
    limit: 5,
  });

  const activeRules = await db
    .select({ value: count() })
    .from(auto_reply_rules)
    .where(eq(auto_reply_rules.user_id, user.id));

  const autoRepliesSent = await db
    .select({ value: count() })
    .from(auto_reply_logs)
    .innerJoin(auto_reply_rules, eq(auto_reply_logs.rule_id, auto_reply_rules.id))
    .where(eq(auto_reply_rules.user_id, user.id));

  // Actual stats from database or explicit unavailable states
  const stats = [
    {
      title: "Total Posts",
      value: totalPosts[0]?.value || 0,
      icon: Send,
      description: "Across all platforms",
      trend: "neutral",
    },
    {
      title: "Total Reach",
      value: "—",
      icon: Users,
      description: "Analytics coming soon",
      trend: "neutral",
    },
    {
      title: "Engagement Rate",
      value: "—",
      icon: BarChart3,
      description: "Analytics coming soon",
      trend: "neutral",
    },
    {
      title: "Auto-Replies Sent",
      value: autoRepliesSent[0]?.value || 0,
      icon: MessageSquare,
      description: "Total automated responses",
      trend: "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your social accounts.
          </p>
        </div>
        <Link href="/dashboard/compose">
          <Button className="gap-2">
            <Plus className="size-4" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.trend === "up" && (
                  <span className="text-green-500 mr-1">
                    {stat.description.split(" ")[0]}
                  </span>
                )}
                {stat.trend === "down" && (
                  <span className="text-red-500 mr-1">
                    {stat.description.split(" ")[0]}
                  </span>
                )}
                {stat.trend === "neutral" ? stat.description : stat.description.substring(stat.description.indexOf(" "))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>
                You have published {totalPosts[0]?.value || 0} posts this month.
              </CardDescription>
            </div>
            <Link href="/dashboard/scheduled">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowUpRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPosts.length > 0 ? (
              <div className="space-y-8">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {post.content.length > 50 
                          ? post.content.substring(0, 50) + "..." 
                          : post.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled for {post.scheduled_at?.toLocaleDateString() || "ASAP"}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <Badge 
                        variant={
                          post.status === "published" ? "default" : 
                          post.status === "scheduled" ? "secondary" : "outline"
                        }
                      >
                        {post.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center text-center">
                <p className="text-muted-foreground">No recent posts found.</p>
                <Link href="/dashboard/compose" className="mt-4">
                  <Button variant="outline" size="sm">Create your first post</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
            <CardDescription>
              Your active social media connections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connectedAccounts.length > 0 ? (
                connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={account.avatar_url || ""} />
                        <AvatarFallback>{account.platform.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none capitalize">
                          {account.platform}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.account_name || "Connected"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-100">
                      Active
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex h-[150px] flex-col items-center justify-center text-center">
                  <p className="text-muted-foreground">No platforms connected.</p>
                  <Link href="/dashboard/accounts" className="mt-4">
                    <Button variant="outline" size="sm">Connect Account</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
