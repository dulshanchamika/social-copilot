import React from "react";
import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account preferences, security, and details.
        </p>
      </div>

      <div className="flex justify-center w-full">
        <UserProfile 
          routing="hash"
          appearance={{
            elements: {
              cardBox: "shadow-none border w-full max-w-4xl",
              rootBox: "w-full max-w-4xl",
              scrollBox: "rounded-none"
            }
          }}
        />
      </div>
    </div>
  );
}
