import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Track your social media performance and engagement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>
            Detailed insights into your posts, reach, and audience growth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <BarChart3 className="size-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Analytics Coming Soon</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                We're currently building out the analytics engine to provide you with deep insights into your social media performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
