"use client";

import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw } from "lucide-react";
import { RuleList } from "@/components/auto-reply/rule-list";
import { RuleSheet } from "@/components/auto-reply/rule-sheet";
import { ActivityLogs } from "@/components/auto-reply/activity-logs";
import { LockedBanner } from "@/components/billing/locked-banner";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";

export default function AutoReplyPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"auto_reply" | "ai_replies">("auto_reply");

  const fetchUserPlan = async () => {
    try {
      const res = await fetch("/api/user/plan");
      const data = await res.json();
      if (data.plan) {
        setUserPlan(data.plan.toLowerCase());
      }
    } catch (e) {
      console.error("Error fetching user plan:", e);
    }
  };

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/auto-reply/rules");
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/auto-reply/logs");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchLogs();
    fetchUserPlan();
  }, []);

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setSheetOpen(true);
  };

  const handleCreateRule = () => {
    if (userPlan === "free") {
      setUpgradeFeature("auto_reply");
      setUpgradeDialogOpen(true);
      return;
    }
    setEditingRule(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Auto-Reply Rules</h2>
          <p className="text-muted-foreground">
            Automate your social media interactions with AI-powered rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => { fetchRules(); fetchLogs(); }}
            disabled={loadingRules || loadingLogs}
          >
            <RefreshCcw className={`size-4 ${loadingRules || loadingLogs ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="gap-2" onClick={handleCreateRule}>
            <Plus className="size-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {userPlan === "free" && (
        <LockedBanner feature="auto_reply" />
      )}

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
            <CardDescription>
              Rules that automatically reply to comments on your posts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RuleList 
              rules={rules} 
              loading={loadingRules} 
              onEdit={handleEditRule}
              onRefresh={fetchRules}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest automated replies sent by your rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityLogs logs={logs} loading={loadingLogs} />
          </CardContent>
        </Card>
      </div>

      <RuleSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen}
        rule={editingRule}
        onSuccess={() => { fetchRules(); fetchLogs(); }}
        onUpgradeTrigger={(feature) => {
          setUpgradeFeature(feature);
          setUpgradeDialogOpen(true);
        }}
      />

      <UpgradeDialog 
        isOpen={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        feature={upgradeFeature}
      />
    </div>
  );
}
