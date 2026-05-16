import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export default function ScheduledPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scheduled Posts</h2>
        <p className="text-muted-foreground">
          View and manage your upcoming social media posts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
            Your posting schedule at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center border rounded-md text-muted-foreground">
            Calendar view placeholder...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
