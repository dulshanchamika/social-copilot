"use client";

import React from "react";
import { useClerk } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Check, 
  ArrowRight
} from "lucide-react";

interface UpgradeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "accounts" | "posts" | "auto_reply" | "ai_captions" | "ai_replies";
}

const FEATURE_META = {
  accounts: {
    title: "Connected Profile Limit Reached",
    description: "You've reached the connection limit of 3 profiles for the Free Basic plan.",
    details: "Connecting multiple channels lets you publish to all platforms in one click.",
  },
  posts: {
    title: "Monthly Post Limit Reached",
    description: "You've reached your monthly allowance of 10 posts on the Free Basic plan.",
    details: "Active scheduling and frequent posts are proven to increase engagement by 4x.",
  },
  auto_reply: {
    title: "Unlock AI Auto-Reply rules",
    description: "Comment automation and auto-reply rules are exclusive to Pro and Business plans.",
    details: "Save hundreds of hours by letting Gemini AI reply to comments instantly with your tone.",
  },
  ai_captions: {
    title: "Unlock AI Caption Generator",
    description: "AI Captions, hashtag suggestions, and content ideas are locked on the Free plan.",
    details: "Generate tailored captions, optimize hashtags, and construct full content calendars.",
  },
};

export function UpgradeDialog({
  isOpen,
  onOpenChange,
  feature = "accounts",
}: UpgradeDialogProps) {
  const { openUserProfile } = useClerk();
  const normalizedFeature = feature === "ai_replies" ? "auto_reply" : feature;
  const meta = FEATURE_META[normalizedFeature];

  const handleUpgrade = () => {
    onOpenChange(false);
    openUserProfile();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-border/80 bg-card p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="size-12 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="size-6 fill-indigo-400/20" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {meta.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground max-w-sm">
            {meta.description}
          </DialogDescription>
        </DialogHeader>

        {/* Feature Comparison highlight */}
        <div className="bg-indigo-950/15 border border-indigo-500/10 rounded-xl p-4 mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Why Upgrade?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {meta.details}
          </p>
          
          <div className="space-y-2 pt-2 border-t border-indigo-500/10">
            <div className="flex items-center gap-2 text-xs">
              <Check className="size-3.5 text-indigo-400 shrink-0" />
              <span className="text-muted-foreground">Up to 10 connected social accounts</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="size-3.5 text-indigo-400 shrink-0" />
              <span className="text-muted-foreground">Unlimited post scheduling & publishing</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="size-3.5 text-indigo-400 shrink-0" />
              <span className="text-muted-foreground">AI Auto-Reply rules comment automation</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="size-3.5 text-indigo-400 shrink-0" />
              <span className="text-muted-foreground">Full Analytics dashboard access</span>
            </div>
          </div>
        </div>

        {/* Upgrade Call-to-action */}
        <div className="flex flex-col gap-2 mt-6">
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 h-10 transition-all duration-200"
          >
            <span>Upgrade to Pro — $19/mo</span>
            <ArrowRight className="size-4" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-xs text-muted-foreground h-9"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
