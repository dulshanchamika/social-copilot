"use client";

import React from "react";
import { useClerk } from "@clerk/nextjs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Sparkles, 
  CreditCard, 
  Settings, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Building,
  FileText
} from "lucide-react";
import { PLAN_LIMITS } from "@/lib/plan-gates";

interface BillingClientProps {
  currentPlan: string;
  accountsCount: number;
  postsCount: number;
  rulesCount: number;
  subscription?: any;
  invoices?: Array<{
    id: string;
    date: string;
    amount: string;
    status: string;
  }>;
}

export function BillingClient({
  currentPlan,
  accountsCount,
  postsCount,
  rulesCount,
  subscription,
  invoices = [],
}: BillingClientProps) {
  const { openUserProfile } = useClerk();
  const plan = currentPlan.toLowerCase() as "free" | "pro" | "business";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const handleManageBilling = () => {
    openUserProfile();
  };

  // Real invoices fetched from Clerk billing statements API, falling back to empty if none are found or if billing is not enabled
  const mockInvoices = invoices;

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Billing & Subscription
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your subscription tier, billing details, and view platform usage limits.
          </p>
        </div>
        <Button 
          onClick={handleManageBilling} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-200 shadow-md shadow-indigo-500/10 flex items-center gap-2"
        >
          <Settings className="size-4" />
          <span>Manage Subscription</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Current Plan Summary */}
        <Card className="md:col-span-1 border border-border bg-card/40 backdrop-blur-sm shadow-xl flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
            <Zap className="size-32 text-indigo-500" />
          </div>
          
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Active Tier
            </CardDescription>
            <CardTitle className="text-3xl font-bold flex items-center gap-2 mt-1">
              {plan === "free" && "Free Basic"}
              {plan === "pro" && "Social Pro"}
              {plan === "business" && "Enterprise Biz"}
              <Badge className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 capitalize font-medium px-2.5 py-0.5 text-xs">
                {plan}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {plan === "free" && "Enjoy standard scheduling across up to 3 connected profiles."}
              {plan === "pro" && "Power user capabilities with 10 social profiles and AI generation."}
              {plan === "business" && "Full multi-platform posting, unlimited accounts, and AI automation."}
            </p>
            <div className="pt-2">
              <span className="text-3xl font-extrabold tracking-tight">
                {plan === "business" ? "$49" : plan === "pro" ? "$19" : "$0"}
              </span>
              <span className="text-muted-foreground text-sm font-medium"> / month</span>
            </div>
            {subscription?.nextPayment && (
              <p className="text-xs text-muted-foreground mt-2">
                Next renewal: {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(subscription.nextPayment.date))} for {subscription.nextPayment.amount?.amount_formatted || `$${(subscription.nextPayment.amount / 100).toFixed(2)}`}
              </p>
            )}
            <div className="pt-4 border-t border-border/60">
              <Button 
                variant="outline" 
                onClick={handleManageBilling} 
                className="w-full flex items-center gap-2 text-xs hover:bg-muted"
              >
                <CreditCard className="size-3.5" />
                <span>Update Payment Details</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Usage & Limit Meters */}
        <Card className="md:col-span-2 border border-border bg-card/40 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Monthly Usage & Limits</CardTitle>
            <CardDescription>
              Your billing period resets on the 1st of every month. Check your feature utilization below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connected Accounts Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-indigo-400" />
                  <span>Connected Profiles</span>
                </span>
                <span className="text-muted-foreground">
                  {accountsCount} / {limits.maxAccounts === Infinity ? "Unlimited" : limits.maxAccounts}
                </span>
              </div>
              <Progress 
                value={limits.maxAccounts === Infinity ? 10 : (accountsCount / limits.maxAccounts) * 100} 
                className="bg-indigo-950/20 [&>div]:bg-indigo-500 h-2.5 rounded-full"
              />
            </div>

            {/* Posts Created Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-purple-400" />
                  <span>Posts Published/Scheduled (This Month)</span>
                </span>
                <span className="text-muted-foreground">
                  {postsCount} / {limits.maxPostsPerMonth === Infinity ? "Unlimited" : limits.maxPostsPerMonth}
                </span>
              </div>
              <Progress 
                value={limits.maxPostsPerMonth === Infinity ? 15 : (postsCount / limits.maxPostsPerMonth) * 100} 
                className="bg-purple-950/20 [&>div]:bg-purple-500 h-2.5 rounded-full"
              />
            </div>

            {/* Auto-Reply Rules Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-4 text-pink-400" />
                  <span>AI Auto-Reply Rules</span>
                </span>
                <span className="text-muted-foreground">
                  {rulesCount} / {limits.maxAutoReplyRules === Infinity ? "Unlimited" : limits.maxAutoReplyRules}
                </span>
              </div>
              <Progress 
                value={limits.maxAutoReplyRules === Infinity ? 5 : limits.maxAutoReplyRules === 0 ? 0 : (rulesCount / limits.maxAutoReplyRules) * 100} 
                className="bg-pink-950/20 [&>div]:bg-pink-500 h-2.5 rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Pricing Matrix */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-6">Compare Available Subscription Tiers</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free Card */}
          <Card className={`border ${plan === "free" ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-card/20"} shadow-lg flex flex-col justify-between`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold">Free Basic</CardTitle>
              <CardDescription className="min-h-10 mt-1.5">Perfect for trying out the core publishing features.</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">$0</span>
                <span className="text-muted-foreground text-sm font-medium"> / mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Connect up to 3 social accounts</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Publish or schedule 10 posts/month</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Platform-specific preview interface</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm opacity-40">
                  <span className="text-sm font-bold w-4 text-center shrink-0">✕</span>
                  <span className="text-muted-foreground">No AI Caption Generator</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm opacity-40">
                  <span className="text-sm font-bold w-4 text-center shrink-0">✕</span>
                  <span className="text-muted-foreground">No AI Auto-Reply automation</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                disabled={plan === "free"}
                onClick={handleManageBilling}
                className="w-full mt-6"
              >
                {plan === "free" ? "Active Plan" : "Downgrade"}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Card */}
          <Card className={`border relative overflow-hidden ${plan === "pro" ? "border-indigo-500/50 bg-indigo-500/5" : "border-border bg-card/20"} shadow-xl flex flex-col justify-between group`}>
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase py-1 px-4 rounded-bl-lg">
              Popular
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-1.5">
                Social Pro <Sparkles className="size-4 text-yellow-500 fill-yellow-500" />
              </CardTitle>
              <CardDescription className="min-h-10 mt-1.5">Great for creators, professional brands, and businesses.</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">$19</span>
                <span className="text-muted-foreground text-sm font-medium"> / mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-medium text-foreground">Connect up to 10 accounts</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-medium text-foreground">Unlimited posts publishing</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Up to 5 active AI Auto-Reply rules</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">AI Caption & Hashtag generator</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Premium Analytics dashboard access</span>
                </div>
              </div>
              <Button 
                onClick={handleManageBilling}
                disabled={plan === "pro"}
                className={`w-full mt-6 ${plan === "pro" ? "bg-indigo-950/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-950/30" : "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/10"}`}
              >
                {plan === "pro" ? "Active Plan" : plan === "business" ? "Downgrade to Pro" : "Upgrade to Pro"}
              </Button>
            </CardContent>
          </Card>

          {/* Business Card */}
          <Card className={`border ${plan === "business" ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-card/20"} shadow-lg flex flex-col justify-between`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-1.5">
                Enterprise Biz <Building className="size-4 text-purple-400" />
              </CardTitle>
              <CardDescription className="min-h-10 mt-1.5">Built for agencies, marketing squads, and massive scale.</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">$49</span>
                <span className="text-muted-foreground text-sm font-medium"> / mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-medium text-foreground">Unlimited connected profiles</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-medium text-foreground">Unlimited monthly posts</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-medium text-foreground">Unlimited AI Auto-Reply rules</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Priority developer Slack & Email support</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Team collaboration & multiple members</span>
                </div>
              </div>
              <Button 
                onClick={handleManageBilling}
                disabled={plan === "business"}
                className={`w-full mt-6 ${plan === "business" ? "bg-indigo-950/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-950/30" : "bg-purple-600 hover:bg-purple-500 text-white font-semibold"}`}
              >
                {plan === "business" ? "Active Plan" : "Get Business"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Billing & Invoice History Section */}
      <Card className="border border-border bg-card/40 backdrop-blur-sm shadow-xl">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="size-5 text-indigo-400" />
              <span>Billing & Invoice History</span>
            </CardTitle>
            <CardDescription>
              Check your past invoices. Official receipts and printable statements are securely managed in your Clerk profile.
            </CardDescription>
          </div>
          {plan !== "free" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManageBilling}
              className="flex items-center gap-1.5 text-xs h-8"
            >
              <span>Access Invoices</span>
              <ExternalLink className="size-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {plan === "free" || mockInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-border/80 rounded-lg">
              <CreditCard className="size-8 text-muted-foreground/60 mb-2.5" />
              <h4 className="text-sm font-semibold">No Invoices Available</h4>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                You are currently on a Free tier with no charge history. Upgrade to Pro or Business to begin your billing lifecycle.
              </p>
            </div>
          ) : (
            <div className="relative overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="px-4 py-3">Invoice Number</th>
                    <th className="px-4 py-3">Billing Date</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {mockInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3.5 font-medium">{inv.id}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{inv.date}</td>
                      <td className="px-4 py-3.5 font-semibold">{inv.amount}</td>
                      <td className="px-4 py-3.5">
                        <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleManageBilling}
                          className="h-8 px-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 text-xs flex items-center gap-1.5 ml-auto"
                        >
                          <span>PDF</span>
                          <ExternalLink className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
