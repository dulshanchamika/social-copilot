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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Rule {
  id: string;
  platform: string;
  account_id: string;
  trigger_type: string;
  keywords: string[];
  reply_template: string | null;
  use_ai: boolean;
  tone: string | null;
  is_active: boolean;
  account?: {
    account_name: string | null;
  };
}

interface RuleListProps {
  rules: Rule[];
  loading: boolean;
  onEdit: (rule: Rule) => void;
  onRefresh: () => void;
}

export function RuleList({ rules, loading, onEdit, onRefresh }: RuleListProps) {
  const toggleRule = async (rule: Rule) => {
    try {
      const res = await fetch(`/api/auto-reply/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.is_active }),
      });

      if (!res.ok) throw new Error("Failed to toggle rule");
      toast.success(rule.is_active ? "Rule disabled" : "Rule enabled");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const res = await fetch(`/api/auto-reply/rules/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete rule");
      toast.success("Rule deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Loading rules...</p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border rounded-md border-dashed">
        <p className="text-muted-foreground">No auto-reply rules found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="capitalize">{rule.platform}</TableCell>
              <TableCell>@{rule.account?.account_name || "Unknown"}</TableCell>
              <TableCell>
                {rule.trigger_type === "any" ? (
                  <Badge variant="outline">Any comment</Badge>
                ) : (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {rule.keywords?.map((k) => (
                      <Badge key={k} variant="secondary">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {rule.use_ai ? (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                    AI ({rule.tone})
                  </Badge>
                ) : (
                  <Badge variant="outline">Template</Badge>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={() => toggleRule(rule)}
                />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(rule)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
