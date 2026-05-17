"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, XCircleIcon, Loader2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Log {
  id: string;
  comment_id: string;
  comment_text: string | null;
  reply_sent: string | null;
  status: string;
  error: string | null;
  created_at: string;
  platform: string;
}

interface ActivityLogsProps {
  logs: Log[];
  loading: boolean;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  success:    { label: "Success",    variant: "default" },
  processing: { label: "Processing", variant: "secondary" },
  failed:     { label: "Failed",     variant: "destructive" },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "success")    return <CheckCircle2Icon className="size-3.5 text-green-500" />;
  if (status === "failed")     return <XCircleIcon className="size-3.5 text-destructive" />;
  if (status === "processing") return <Loader2Icon className="size-3.5 text-blue-500 animate-spin" />;
  return null;
}

export function ActivityLogs({ logs, loading }: ActivityLogsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 border rounded-md border-dashed">
        <p className="text-muted-foreground">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Reply Sent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const s = STATUS_BADGE[log.status] ?? { label: log.status, variant: "outline" as const };
            return (
              <TableRow key={log.id}>
                <TableCell className="capitalize">{log.platform}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {log.comment_text || "No text"}
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {log.status === "failed" ? (
                    <span className="text-destructive font-medium text-sm block truncate" title={log.error || "Unknown error"}>
                      Error: {log.error || "Unknown error"}
                    </span>
                  ) : (
                    log.reply_sent || "No reply sent"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={s.variant} className="gap-1 text-xs">
                    <StatusIcon status={log.status} />
                    {s.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
