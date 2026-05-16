import React from "react";
import { ComposerForm } from "@/components/compose/composer-form";

export default function ComposePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compose Post</h2>
        <p className="text-muted-foreground">
          Create and schedule a new post for your social platforms.
        </p>
      </div>

      <ComposerForm />
    </div>
  );
}
