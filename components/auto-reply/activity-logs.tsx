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
import { formatDistanceToNow } from "date-fns";

interface Log {
  id: string;
  comment_id: string;
  comment_text: string | null;
  reply_sent: string | null;
  created_at: string;
  platform: string;
}

interface ActivityLogsProps {
  logs: Log[];
  loading: boolean;
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
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="capitalize">{log.platform}</TableCell>
              <TableCell className="max-w-[300px] truncate">
                {log.comment_text || "No text"}
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {log.reply_sent || "No reply sent"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
