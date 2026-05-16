import React from "react";
import { ScheduledPostsList } from "@/components/scheduled/scheduled-posts-list";

export default function ScheduledPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scheduled Posts</h2>
        <p className="text-muted-foreground">
          View and manage your upcoming social media posts.
        </p>
      </div>

      <ScheduledPostsList />
    </div>
  );
}
