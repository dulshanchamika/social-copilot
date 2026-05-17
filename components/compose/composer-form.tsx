"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon, ImageIcon, SparklesIcon, XIcon, HashIcon,
  Loader2Icon, UploadIcon, CheckCircle2Icon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { upload } from "@imagekit/react";
import type { UploadResponse } from "@imagekit/react";
import { PLATFORMS, PlatformId } from "@/lib/platforms";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";

// ─── Platform metadata ────────────────────────────────────────────────────────
const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  x: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 2200,
  youtube: 5000,
  pinterest: 500,
  discord: 2000,
  slack: 40000,
};

const PLATFORM_COLORS: Record<string, string> = {
  x: "#000000",
  instagram: "#E4405F",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  tiktok: "#000000",
  youtube: "#FF0000",
  pinterest: "#BD081C",
  discord: "#5865F2",
  slack: "#4A154B",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string | null;
  avatar_url: string | null;
}

interface MediaPreview {
  url: string;
  fileId: string;
  name: string;
}

// ─── Hashtag suggestion helper ────────────────────────────────────────────────
const COMMON_HASHTAGS: Record<string, string[]> = {
  marketing: ["#marketing", "#digitalmarketing", "#socialmedia", "#branding"],
  product: ["#productlaunch", "#newproduct", "#innovation", "#startup"],
  tech: ["#tech", "#technology", "#AI", "#software"],
  business: ["#business", "#entrepreneur", "#success", "#growth"],
  lifestyle: ["#lifestyle", "#motivation", "#inspiration", "#life"],
};

function suggestHashtags(text: string): string[] {
  const lower = text.toLowerCase();
  const results: string[] = [];
  for (const [key, tags] of Object.entries(COMMON_HASHTAGS)) {
    if (lower.includes(key)) results.push(...tags);
  }
  return [...new Set(results)].slice(0, 8);
}

// ─── ImageKit auth fetcher ────────────────────────────────────────────────────
async function imagekitAuthenticator() {
  const res = await fetch("/api/imagekit/auth");
  if (!res.ok) throw new Error("ImageKit auth failed");
  const { token, expire, signature } = await res.json();
  return { token, expire, signature };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ComposerForm() {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  // Accounts
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Content
  const [content, setContent] = useState("");
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [showHashtags, setShowHashtags] = useState(false);

  // Media
  const [mediaItems, setMediaItems] = useState<MediaPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const imagekitPublicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "";
  const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

  // AI
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);

  // Scheduling
  const [postNow, setPostNow] = useState(true);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<string>("");

  // Plan limits state
  const [userPlan, setUserPlan] = useState<string>("free");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"ai_captions" | "posts">("ai_captions");

  // ── Load connected accounts ───────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: ConnectedAccount[]) => {
        setAccounts(Array.isArray(data) ? data : []);
        setLoadingAccounts(false);
      })
      .catch(() => setLoadingAccounts(false));

    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) {
          setUserPlan(data.plan.toLowerCase());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const selectedPlatforms = accounts
      .filter(a => selectedAccountIds.includes(a.id))
      .map(a => a.platform);
    
    const uniquePlatforms = [...new Set(selectedPlatforms)];

    if (uniquePlatforms.length > 0 && !activePreviewPlatform) {
      setActivePreviewPlatform(uniquePlatforms[0]);
    }
    if (uniquePlatforms.length > 0 && !uniquePlatforms.includes(activePreviewPlatform)) {
      setActivePreviewPlatform(uniquePlatforms[0]);
    }
  }, [selectedAccountIds, activePreviewPlatform, accounts]);

  // ── Hashtag suggestions ───────────────────────────────────────────────────
  useEffect(() => {
    const suggestions = suggestHashtags(content);
    setHashtagSuggestions(suggestions);
  }, [content]);

  const handleToggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  const appendHashtag = (tag: string) => {
    setContent((prev) => (prev.endsWith(" ") || prev === "" ? prev + tag : prev + " " + tag));
  };

  // ── Scheduled datetime ────────────────────────────────────────────────────
  const getScheduledAt = useCallback((): string | null => {
    if (postNow || !scheduleDate) return null;
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const dt = new Date(scheduleDate);
    dt.setHours(hours, minutes, 0, 0);
    return dt.toISOString();
  }, [postNow, scheduleDate, scheduleTime]);

  // ── AI streaming caption ──────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    if (userPlan === "free") {
      setUpgradeFeature("ai_captions");
      setUpgradeDialogOpen(true);
      return;
    }

    if (!topic.trim()) {
      toast.error("Enter a topic for AI generation");
      return;
    }

    const selectedPlatforms = accounts
      .filter((a) => selectedAccountIds.includes(a.id))
      .map((a) => a.platform);
    const uniquePlatforms = [...new Set(selectedPlatforms)];

    if (uniquePlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platforms: uniquePlatforms, tone }),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "AI request failed");
      }

      // Only wipe content once we have a successful stream response
      setContent("");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const chunk = JSON.parse(payload);
            if (typeof chunk === "string") {
              setContent((prev) => prev + chunk);
            } else if (chunk && typeof chunk === "object" && chunk.error) {
              throw new Error(chunk.error);
            }
          } catch (e: any) {
            // Rethrow if it's our explicit error, otherwise ignore malformed JSON
            if (e instanceof Error && e.message !== "Unexpected token" && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }
      toast.success("Caption generated!");
    } catch (e: any) {
      console.error("AI Generation error:", e);
      toast.error(e.message || "Failed to generate caption");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Manual upload logic ──────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const auth = await imagekitAuthenticator();
        
        const res = await upload({
          file: file,
          fileName: file.name,
          publicKey: imagekitPublicKey,
          signature: auth.signature,
          token: auth.token,
          expire: auth.expire,
          folder: "/social-copilot",
        });

        setMediaItems((prev) => [
          ...prev,
          { 
            url: res.url as string, 
            fileId: res.fileId as string, 
            name: res.name as string 
          },
        ]);
      }
      toast.success("Media uploaded");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (isDraft: boolean) => {
    if (!content.trim()) { toast.error("Content is required"); return; }
    if (selectedAccountIds.length === 0) { toast.error("Select at least one account"); return; }
    if (!isDraft && !postNow && !scheduleDate) {
      toast.error("Pick a schedule date or toggle Post Now");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          accountIds: selectedAccountIds,
          scheduledAt: isDraft ? null : getScheduledAt(),
          isDraft,
          mediaUrls: mediaItems.map((m) => m.url),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error === "upgrade_required") {
          setUpgradeFeature("posts");
          setUpgradeDialogOpen(true);
          return;
        }
        throw new Error(data.error);
      }
      toast.success(isDraft ? "Draft saved!" : postNow ? "Post published!" : "Post scheduled!");
      router.push("/dashboard/scheduled");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Per-platform character count ──────────────────────────────────────────
  const charCount = content.length;
  const activePlatformLimit = activePreviewPlatform
    ? PLATFORM_CHAR_LIMITS[activePreviewPlatform] ?? 0
    : 0;
  const isOverLimit = activePlatformLimit > 0 && charCount > activePlatformLimit;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Left: Editor ──────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-5">

        {/* Platform chip selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Publish To</CardTitle>
            <CardDescription>Select your connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2Icon className="size-4 animate-spin" /> Loading accounts…
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected accounts.{" "}
                <a href="/dashboard/accounts" className="underline text-primary">Connect one →</a>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts
                  .filter((acct) => PLATFORMS[acct.platform as PlatformId]?.canPublish)
                  .map((acct) => {
                  const selected = selectedAccountIds.includes(acct.id);
                  const color = PLATFORM_COLORS[acct.platform] ?? "#888";
                  return (
                    <button
                      key={acct.id}
                      type="button"
                      onClick={() => handleToggleAccount(acct.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                        selected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30"
                      )}
                      style={selected ? { backgroundColor: color } : {}}
                    >
                      {selected && <CheckCircle2Icon className="size-3.5" />}
                      <span className="capitalize">{acct.platform}</span>
                      {acct.account_name && (
                        <span className="opacity-70 text-xs">@{acct.account_name}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Caption Generator */}
        <Card className={cn(userPlan === "free" && "relative overflow-hidden border-indigo-500/20 bg-gradient-to-r from-indigo-950/5 to-purple-950/5")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-primary" /> AI Caption
              </span>
              {userPlan === "free" && (
                <Badge className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-[10px] font-semibold py-0.5 px-2">
                  PRO FEATURE
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {userPlan === "free" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/75 backdrop-blur-[1.5px] p-4 text-center">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <span>AI Caption Generator is Locked</span>
                  <SparklesIcon className="size-3.5 text-yellow-500 fill-yellow-500/10" />
                </p>
                <Button 
                  size="sm" 
                  variant="link" 
                  onClick={() => { setUpgradeFeature("ai_captions"); setUpgradeDialogOpen(true); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold p-0 h-auto mt-1"
                >
                  Upgrade plan to unlock AI writing →
                </Button>
              </div>
            )}
            <div className={cn(userPlan === "free" && "opacity-25 pointer-events-none")}>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Topic (e.g. Launching our new product)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex-1 min-w-[180px]"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
                />
                <Select value={tone} onValueChange={(v) => setTone(v || "professional")}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="funny">Funny</SelectItem>
                    <SelectItem value="excited">Excited</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerateAI} disabled={isGenerating} className="gap-2">
                  {isGenerating ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
                  {isGenerating ? "Generating…" : "Generate"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caption textarea */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Caption</CardTitle>
              <button
                type="button"
                onClick={() => setShowHashtags((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <HashIcon className="size-3.5" />
                Hashtags
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Write your post caption…"
              className="min-h-[160px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {/* Per-platform char counters */}
            {selectedAccountIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {accounts.filter(a => selectedAccountIds.includes(a.id)).map((a) => {
                  const limit = PLATFORM_CHAR_LIMITS[a.platform] ?? 0;
                  const over = limit > 0 && charCount > limit;
                  return (
                    <span
                      key={a.id}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border font-mono",
                        over
                          ? "border-destructive text-destructive bg-destructive/10"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {a.platform} (@{a.account_name || "account"}): {charCount}/{limit > 0 ? limit : "∞"}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Hashtag suggestions */}
            {showHashtags && hashtagSuggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {hashtagSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => appendHashtag(tag)}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="size-4" /> Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Thumbnail grid */}
            {mediaItems.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {mediaItems.map((m) => (
                  <div key={m.fileId} className="relative group w-20 h-20 rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.name} className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => setMediaItems((prev) => prev.filter((x) => x.fileId !== m.fileId))}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual file upload */}
            {imagekitPublicKey && imagekitUrlEndpoint ? (
              <div className="relative">
                <input
                  type="file"
                  ref={uploadRef}
                  onChange={handleFileUpload}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={isUploading}
                  onClick={() => uploadRef.current?.click()}
                >
                  {isUploading
                    ? <Loader2Icon className="size-4 animate-spin" />
                    : <UploadIcon className="size-4" />}
                  {isUploading ? "Uploading…" : "Upload Media"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Configure <code>NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY</code> and{" "}
                <code>NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT</code> to enable uploads.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={postNow}
                onCheckedChange={setPostNow}
                id="post-now-switch"
              />
              <Label htmlFor="post-now-switch" className="cursor-pointer">
                Post Now
              </Label>
            </div>

            {!postNow && (
              <div className="flex flex-wrap gap-3 items-center">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" className="gap-2 w-[200px] justify-start" />
                    }
                  >
                    <CalendarIcon className="size-4" />
                    {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={(d) => { setScheduleDate(d); setCalendarOpen(false); }}
                      disabled={(d) => d < new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-[130px]"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || isOverLimit}
            className="gap-2"
          >
            {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
            {postNow ? "Post Now" : "Schedule Post"}
          </Button>
        </div>
      </div>

      {/* ── Right: Preview ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview</CardTitle>
            {(() => {
              const selectedPlatforms = [...new Set(accounts.filter(a => selectedAccountIds.includes(a.id)).map(a => a.platform))];
              if (selectedPlatforms.length <= 1) return null;
              return (
                <Tabs
                  value={activePreviewPlatform}
                  onValueChange={setActivePreviewPlatform}
                >
                  <TabsList className="flex-wrap h-auto gap-1">
                    {selectedPlatforms.map((p) => (
                      <TabsTrigger key={p} value={p} className="capitalize text-xs">
                        {p}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              );
            })()}
          </CardHeader>
          <CardContent>
            {selectedAccountIds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select an account to preview
              </p>
            ) : (
              <div className="space-y-3">
                {/* Mock platform card */}
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: PLATFORM_COLORS[activePreviewPlatform] ?? "#888" }}
                    >
                      {activePreviewPlatform.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none capitalize">
                        {activePreviewPlatform}
                      </p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>

                  {/* Media preview */}
                  {mediaItems.length > 0 && (
                    <div className="rounded-lg overflow-hidden aspect-video bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaItems[0].url}
                        alt="preview"
                        className="object-cover w-full h-full"
                      />
                      {mediaItems.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                          +{mediaItems.length - 1}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {content || <span className="text-muted-foreground">Your caption will appear here…</span>}
                  </p>
                </div>

                {/* Char limit badge */}
                {activePreviewPlatform && (() => {
                  const limit = PLATFORM_CHAR_LIMITS[activePreviewPlatform] ?? 0;
                  const over = limit > 0 && charCount > limit;
                  if (limit === 0) return null;
                  return (
                    <Badge variant={over ? "destructive" : "secondary"} className="text-xs">
                      {charCount} / {limit} chars
                    </Badge>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <UpgradeDialog 
        isOpen={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        feature={upgradeFeature}
      />
    </div>
  );
}
