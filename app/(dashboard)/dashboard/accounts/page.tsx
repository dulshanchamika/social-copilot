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

export default function AccountsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Connected Accounts</h2>
          <p className="text-muted-foreground">
            Manage your social media platform connections.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Connect Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            Connect your social media accounts to start posting and automating replies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <h3 className="mt-4 text-lg font-semibold">No accounts connected</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                You haven't connected any social media accounts yet.
              </p>
              <Button size="sm" className="relative">
                Connect Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
