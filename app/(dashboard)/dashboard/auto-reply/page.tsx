import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AutoReplyPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Auto-Reply Rules</h2>
          <p className="text-muted-foreground">
            Automate your social media interactions with AI-powered rules.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Create Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
          <CardDescription>
            Rules that automatically reply to comments on your posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border rounded-md text-muted-foreground border-dashed">
            No active rules found. Create one to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
