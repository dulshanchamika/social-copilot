"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span>AI-Powered Social Media Growth</span>
          </div>
          
          <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-200">
            Automate Your Social Presence with{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </h1>
          
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-300">
            Schedule posts, automate replies, and grow your audience across all platforms with the power of Social Copilot. The only tool you&apos;ll ever need.
          </p>
          
          <div className="mt-10 flex flex-col gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-500">
            <Button size="lg" className="h-12 px-8 text-base" render={<Link href="/sign-up" />}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" render={<Link href="#features" />}>
              Explore Features
            </Button>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 bg-primary/20 blur-[120px]" />
      <div className="absolute top-40 right-0 -z-10 h-[300px] w-[300px] bg-accent/10 blur-[100px]" />
    </section>
  );
}
