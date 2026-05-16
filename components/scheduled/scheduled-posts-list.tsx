"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  Trash2Icon,
  CalendarIcon,
  Loader2Icon,
  RefreshCwIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformResult {
  id: string;
  platform: string;
  status: string;
  platform_post_id: string | null;
  error: string | null;
}

interface Post {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  platform_results: PlatformResult[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  published: { label: "Published", variant: "default" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  draft:     { label: "Draft",     variant: "outline" },
  failed:    { label: "Failed",    variant: "destructive" },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "published") return <CheckCircle2Icon className="size-3.5 text-green-500" />;
  if (status === "failed")    return <XCircleIcon className="size-3.5 text-destructive" />;
  if (status === "scheduled") return <ClockIcon className="size-3.5 text-muted-foreground" />;
  return null;
}

// ─── Reschedule dialog ────────────────────────────────────────────────────────
function RescheduleDialog({
  post,
  open,
  onClose,
  onSaved,
}: {
  post: Post;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Post) => void;
}) {
  const [content, setContent] = useState(post.content);
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);

  // Reset when post changes
  useEffect(() => {
    setContent(post.content);
    setScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "");
  }, [post]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          isDraft: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Post updated");
      onSaved(data);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit / Reschedule Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Caption</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" /> Schedule date & time
            </Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to publish immediately.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ScheduledPostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/posts?limit=50");
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleDelete = async (post: Post) => {
    if (!confirm(`Delete this post? This cannot be undone.`)) return;
    setDeletingId(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success("Post deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <CalendarIcon className="size-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">No posts yet.</p>
        <Button render={<a href="/dashboard/compose" />} variant="outline" size="sm">
          Create your first post
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => loadPosts(true)}
          disabled={refreshing}
        >
          <RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-6" />
              <TableHead>Caption</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const isExpanded = expandedId === post.id;
              const s = STATUS_BADGE[post.status] ?? { label: post.status, variant: "outline" as const };
              const hasResults = post.platform_results && post.platform_results.length > 0;

              return (
                <React.Fragment key={post.id}>
                  {/* Main row */}
                  <TableRow
                    className={cn(
                      "cursor-pointer hover:bg-muted/30 transition-colors",
                      isExpanded && "bg-muted/20"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : post.id)}
                  >
                    <TableCell className="pr-0">
                      {hasResults
                        ? isExpanded
                          ? <ChevronDownIcon className="size-4 text-muted-foreground" />
                          : <ChevronRightIcon className="size-4 text-muted-foreground" />
                        : null}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="line-clamp-1 text-sm">{post.content}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.platforms.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs capitalize">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant} className="gap-1 text-xs">
                        <StatusIcon status={post.status} />
                        {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {post.status === "published" && post.published_at
                        ? format(new Date(post.published_at), "MMM d, yyyy · h:mm a")
                        : post.scheduled_at
                        ? format(new Date(post.scheduled_at), "MMM d, yyyy · h:mm a")
                        : post.published_at
                        ? format(new Date(post.published_at), "MMM d, yyyy · h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {(post.status === "draft" || post.status === "scheduled") && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditPost(post)}
                            title="Edit / Reschedule"
                          >
                            <EditIcon className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(post)}
                          disabled={deletingId === post.id}
                          title="Delete"
                        >
                          {deletingId === post.id
                            ? <Loader2Icon className="size-3.5 animate-spin" />
                            : <Trash2Icon className="size-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded per-platform results */}
                  {isExpanded && hasResults && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="pt-0 pb-3 pl-10">
                        <div className="rounded-lg border bg-muted/10 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Platform</th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Post ID</th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {post.platform_results.map((r) => (
                                <tr key={r.id} className="border-b last:border-0">
                                  <td className="px-3 py-2 capitalize font-medium">{r.platform}</td>
                                  <td className="px-3 py-2">
                                    <span className="flex items-center gap-1">
                                      <StatusIcon status={r.status} />
                                      <span className="capitalize">{r.status}</span>
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-muted-foreground">
                                    {r.platform_post_id ?? "—"}
                                  </td>
                                  <td className="px-3 py-2 text-destructive">
                                    {r.error ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      {editPost && (
        <RescheduleDialog
          post={editPost}
          open={!!editPost}
          onClose={() => setEditPost(null)}
          onSaved={handleUpdated}
        />
      )}
    </>
  );
}
