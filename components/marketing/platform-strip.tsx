"use client";

import React from "react";

const platforms = [
  { name: "Instagram", color: "#E4405F" },
  { name: "YouTube", color: "#FF0000" },
  { name: "TikTok", color: "#000000" },
  { name: "Facebook", color: "#1877F2" },
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "Pinterest", color: "#BD081C" },
  { name: "Discord", color: "#5865F2" },
  { name: "X", color: "#000000" },
  { name: "Slack", color: "#4A154B" },
];

export function PlatformStrip() {
  return (
    <div className="w-full bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Integrated with your favorite platforms
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group flex items-center gap-2 rounded-full border bg-background px-4 py-2 transition-all hover:border-primary hover:shadow-sm"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: platform.color }}
              />
              <span className="text-sm font-medium">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
