"use client";

import React from "react";
import { useClerk } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ArrowRight } from "lucide-react";

interface LockedBannerProps {
  title?: string;
  description?: string;
  feature?: "accounts" | "posts" | "auto_reply" | "ai_captions" | "analytics";
}

const FEATURE_META = {
  accounts: {
    title: "Connected Accounts Limit Reached",
    description: "You have connected the maximum of 3 social media profiles allowed on the Free Basic plan. Upgrade to connect up to 10 profiles.",
  },
  posts: {
    title: "Post Scheduling Limit Met",
    description: "You have published or scheduled 10 posts this calendar month. Upgrade to Pro to enjoy unlimited posting, AI caption tools, and more.",
  },
  auto_reply: {
    title: "AI Auto-Reply Rules Locked",
    description: "Automated comment watching and AI-generated replies are premium features available on Pro and Business subscription plans.",
  },
  ai_captions: {
    title: "AI Caption Assistant Locked",
    description: "Harness the power of Gemini AI to draft captions, suggest hashtags, and plan calendar ideas. Available on paid plans.",
  },
  analytics: {
    title: "Premium Analytics Locked",
    description: "Gain deeper insights into platform performance, engagement rates, reach, and follower metrics. Available on paid plans.",
  },
};

export function LockedBanner({
  title,
  description,
  feature = "auto_reply",
}: LockedBannerProps) {
  const { openUserProfile } = useClerk();
  const meta = FEATURE_META[feature];

  const handleUpgrade = () => {
    openUserProfile();
  };

  return (
    <Card className="border border-indigo-500/20 bg-gradient-to-r from-indigo-950/10 via-purple-950/10 to-pink-950/10 backdrop-blur-sm overflow-hidden relative shadow-lg">
      <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
        <Lock className="size-48 text-indigo-500" />
      </div>
      
      <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
            <Lock className="size-5" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{title || meta.title}</span>
              <Sparkles className="size-4 text-yellow-500 fill-yellow-500/10" />
            </h4>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {description || meta.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3">
          <Button 
            onClick={handleUpgrade}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-md shadow-indigo-500/10 transition-all duration-200"
          >
            <span>Upgrade Now</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
