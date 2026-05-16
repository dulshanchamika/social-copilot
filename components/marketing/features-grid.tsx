"use client";

import React from "react";
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Zap, 
  Shield, 
  Globe 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    title: "Multi-Platform Scheduling",
    description: "Plan and schedule your content across 9+ social platforms from a single dashboard.",
    icon: Calendar,
  },
  {
    title: "AI Auto-Replies",
    description: "Let our AI handle common comments and questions with smart, context-aware responses.",
    icon: MessageSquare,
  },
  {
    title: "Advanced Analytics",
    description: "Deep insights into your performance, audience growth, and engagement metrics.",
    icon: BarChart3,
  },
  {
    title: "Instant Publishing",
    description: "Publish your content immediately with zero delay. No more waiting for manual uploads.",
    icon: Zap,
  },
  {
    title: "Secure Auth",
    description: "Enterprise-grade security with Clerk authentication ensuring your data stays safe.",
    icon: Shield,
  },
  {
    title: "Global Reach",
    description: "Target different timezones and regions with our intelligent scheduling engine.",
    icon: Globe,
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to <span className="text-primary">dominate</span> social media
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful tools designed for creators, marketers, and businesses of all sizes.
          </p>
        </div>
        
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group border-muted/50 bg-background transition-all hover:border-primary/50 hover:shadow-md animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
