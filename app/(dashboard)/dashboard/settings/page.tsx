import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account preferences and application settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure your profile, notification preferences, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <Settings className="size-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Settings Coming Soon</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                We're working on bringing you full control over your account and application preferences.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
