"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell
} from "recharts";
import { PlatformConfig, PLATFORMS } from "@/lib/platforms";

interface AnalyticsChartsProps {
  postsOverTime: any[];
  engagementByPlatform: any[];
  platformBreakdown: any[];
}

export function AnalyticsCharts({ postsOverTime, engagementByPlatform, platformBreakdown }: AnalyticsChartsProps) {
  const platformColors: Record<string, string> = {
    instagram: PLATFORMS.instagram.color,
    youtube: PLATFORMS.youtube.color,
    tiktok: PLATFORMS.tiktok.color,
    facebook: PLATFORMS.facebook.color,
    linkedin: PLATFORMS.linkedin.color,
    pinterest: PLATFORMS.pinterest.color,
    discord: PLATFORMS.discord.color,
    x: PLATFORMS.x.color,
    slack: PLATFORMS.slack.color,
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Posts Over Time</CardTitle>
          <CardDescription>Number of posts published across platforms.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={postsOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  className="text-xs text-muted-foreground"
                />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                {Object.keys(PLATFORMS).map((platformId) => {
                  // Only render lines for platforms that have data in postsOverTime
                  const hasData = postsOverTime.some(d => d[platformId] !== undefined);
                  if (hasData) {
                    return (
                      <Line 
                        key={platformId} 
                        type="monotone" 
                        dataKey={platformId} 
                        name={PLATFORMS[platformId as keyof typeof PLATFORMS].name} 
                        stroke={platformColors[platformId]} 
                        strokeWidth={2}
                        dot={false}
                      />
                    );
                  }
                  return null;
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
          <CardDescription>Distribution of posts by platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="platform"
                  label={(props: any) => `${PLATFORMS[props.platform as keyof typeof PLATFORMS]?.name || props.platform} ${(props.percent * 100).toFixed(0)}%`}
                >
                  {platformBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={platformColors[entry.platform] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [value, PLATFORMS[name as keyof typeof PLATFORMS]?.name || name]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Engagement by Platform</CardTitle>
          <CardDescription>Average engagement rate (%) per platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementByPlatform} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="platform" 
                  tickFormatter={(val) => PLATFORMS[val as keyof typeof PLATFORMS]?.name || val}
                  className="text-xs text-muted-foreground"
                />
                <YAxis className="text-xs text-muted-foreground" tickFormatter={(val) => `${(val / 100).toFixed(1)}%`} />
                <Tooltip 
                  formatter={(value: any) => [`${(Number(value) / 100).toFixed(2)}%`, 'Engagement Rate']}
                  labelFormatter={(label) => PLATFORMS[label as keyof typeof PLATFORMS]?.name || label}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                />
                <Bar dataKey="engagementRate" radius={[4, 4, 0, 0]}>
                  {engagementByPlatform.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={platformColors[entry.platform] || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* For Top Performing Posts, we'll render it in a separate table component or here */}
    </div>
  );
}
