import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAnalyticsData } from "@/lib/services/analytics-service";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { TopPostsTable } from "@/components/dashboard/top-posts-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, MousePointerClick, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage(
  props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_id, userId),
  });

  if (!user) {
    redirect("/sign-in");
  }

  const isFreePlan = user.plan === "free";

  let startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  let endDate = new Date();

  if (searchParams?.from && typeof searchParams.from === "string") {
    startDate = new Date(searchParams.from);
  }
  if (searchParams?.to && typeof searchParams.to === "string") {
    endDate = new Date(searchParams.to);
  }

  const data = isFreePlan 
    ? {
        overview: { totalPosts: 0, totalReach: 0, avgEngagementRate: 0, newFollowers: null as number | null },
        postsOverTime: [],
        engagementByPlatform: [],
        platformBreakdown: [],
        topPerformingPosts: []
      }
    : await getAnalyticsData(user.id, startDate, endDate);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 relative">
      {isFreePlan && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="max-w-md text-center p-6 border rounded-xl shadow-lg bg-card text-card-foreground flex flex-col items-center gap-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Analytics Locked</h2>
            <p className="text-muted-foreground">
              Deep dive into your social media performance, track engagement metrics, and analyze trends. Upgrade to Pro or Business to access full analytics.
            </p>
            <Button render={<Link href="/dashboard/billing" />} size="lg" className="w-full mt-4">
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <div className="flex items-center space-x-2">
          <DateRangePicker />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalPosts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all connected platforms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalReach.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total impressions generated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data.overview.avgEngagementRate / 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Average interaction percentage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.overview.newFollowers !== null ? (
              <>
                <div className="text-2xl font-bold">
                  {data.overview.newFollowers >= 0 ? "+" : ""}
                  {data.overview.newFollowers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                <p className="text-xs text-muted-foreground">
                  Data will appear after the first analytics sync
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts 
        postsOverTime={data.postsOverTime} 
        engagementByPlatform={data.engagementByPlatform}
        platformBreakdown={data.platformBreakdown}
      />

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <TopPostsTable posts={data.topPerformingPosts} />
        </CardContent>
      </Card>
    </div>
  );
}
