"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string | null;
}

interface RuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: {
    id: string;
    platform: string;
    account_id: string;
    trigger_type: string;
    keywords: string[] | null;
    use_ai: boolean;
    reply_template: string | null;
    tone: string | null;
    is_active: boolean;
  }; // If editing
  onSuccess: () => void;
  onUpgradeTrigger?: (feature: "auto_reply" | "ai_replies") => void;
}

export function RuleSheet({ open, onOpenChange, rule, onSuccess, onUpgradeTrigger }: RuleSheetProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [platform, setPlatform] = useState(rule?.platform || "");
  const [accountId, setAccountId] = useState(rule?.account_id || "");
  const [triggerType, setTriggerType] = useState(rule?.trigger_type || "any");
  const [keywords, setKeywords] = useState(rule?.keywords?.join(", ") || "");
  const [replyMode, setReplyMode] = useState(rule?.use_ai ? "ai" : "template");
  const [replyTemplate, setReplyTemplate] = useState(rule?.reply_template || "");
  const [tone, setTone] = useState(rule?.tone || "friendly");
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);

  useEffect(() => {
    if (open) {
      setLoadingAccounts(true);
      fetch("/api/accounts?mode=auto-reply")
        .then((r) => r.json())
        .then((data) => {
          setAccounts(Array.isArray(data) ? data : []);
          setLoadingAccounts(false);
        })
        .catch(() => setLoadingAccounts(false));
    }
  }, [open]);

  useEffect(() => {
    if (rule) {
      setPlatform(rule.platform);
      setAccountId(rule.account_id);
      setTriggerType(rule.trigger_type);
      setKeywords(rule.keywords?.join(", ") || "");
      setReplyMode(rule.use_ai ? "ai" : "template");
      setReplyTemplate(rule.reply_template || "");
      setTone(rule.tone || "friendly");
      setIsActive(rule.is_active ?? true);
    } else {
      setPlatform("");
      setAccountId("");
      setTriggerType("any");
      setKeywords("");
      setReplyMode("template");
      setReplyTemplate("");
      setTone("friendly");
      setIsActive(true);
    }
  }, [rule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }

    setLoading(true);
    try {
      const selectedAccount = accounts.find((a) => a.id === accountId);
      const url = rule ? `/api/auto-reply/rules/${rule.id}` : "/api/auto-reply/rules";
      const method = rule ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedAccount?.platform,
          accountId,
          triggerType,
          keywords: triggerType === "keyword" ? keywords.split(",").map((k: string) => k.trim()).filter(Boolean) : [],
          replyTemplate: replyMode === "template" ? replyTemplate : null,
          useAi: replyMode === "ai",
          tone: replyMode === "ai" ? tone : null,
          isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (res.status === 403 && error.error === "upgrade_required") {
          onOpenChange(false);
          onUpgradeTrigger?.(error.feature || "auto_reply");
          return;
        }
        throw new Error(error.error || "Failed to save rule");
      }

      toast.success(rule ? "Rule updated" : "Rule created");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rule ? "Edit Rule" : "Create Auto-Reply Rule"}</SheetTitle>
          <SheetDescription>
            Configure how your account should automatically reply to comments.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Connected Account</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {loadingAccounts ? (
                  <div className="p-2 flex items-center justify-center">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No accounts found that support auto-replies.
                  </div>
                ) : (
                  accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="capitalize">{acc.platform}</span> - {acc.account_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trigger</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v || "any")}>
              <SelectTrigger>
                <SelectValue placeholder="Select trigger type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any comment</SelectItem>
                <SelectItem value="keyword">Keyword match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === "keyword" && (
            <div className="space-y-2">
              <Label>Keywords (comma separated)</Label>
              <Input
                placeholder="e.g. price, how much, info"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Reply Mode</Label>
            <Select value={replyMode} onValueChange={(v) => setReplyMode(v || "template")}>
              <SelectTrigger>
                <SelectValue placeholder="Select reply mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template">Static template</SelectItem>
                <SelectItem value="ai">AI-generated reply</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {replyMode === "template" ? (
            <div className="space-y-2">
              <Label>Reply Template</Label>
              <Textarea
                placeholder="Write your automated reply..."
                value={replyTemplate}
                onChange={(e) => setReplyTemplate(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>AI Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v || "friendly")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="witty">Witty</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Gemini will generate a contextual reply based on the comment and this tone.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Enable Rule</Label>
              <p className="text-xs text-muted-foreground">
                Turn this rule on or off
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {rule ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
