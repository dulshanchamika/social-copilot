"use client";

import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle, 
  XCircle, 
  Loader, 
  ExternalLink, 
  Unlink2,
  AlertCircle
} from "lucide-react";
import { PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND_ICONS } from "@/components/ui/brand-icons";


interface PlatformCardProps {
  platform: {
    id: PlatformId;
    name: string;
    color: string;
  };
  connectedAccount?: {
    id: string;
    account_name: string | null;
    avatar_url: string | null;
    expires_at: string | null;
  };
}

export function PlatformCard({ platform, connectedAccount }: PlatformCardProps) {
  const Icon = BRAND_ICONS[platform.id];
  const isConnected = !!connectedAccount;
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const router = useRouter();

  const handleConnect = () => {
    setIsConnecting(true);
    window.location.href = `/api/oauth/${platform.id}/connect`;
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${platform.name}?`)) return;
    
    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/oauth/${platform.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to disconnect. Please try again.");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isExpired = connectedAccount?.expires_at && new Date(connectedAccount.expires_at) < new Date();

  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      isConnected ? "border-primary/20 bg-primary/5" : "bg-card"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${platform.color}15`, color: platform.color }}
          >
            <Icon className="size-6" />
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className="font-semibold">
            {isConnected ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="size-3" /> Not Connected
              </span>
            )}
          </Badge>
        </div>
        <CardTitle className="mt-4">{platform.name}</CardTitle>
        <CardDescription>
          {isConnected 
            ? `Post and automate ${platform.name} replies.`
            : `Connect your ${platform.name} account to start.`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-4">
        {isConnected ? (
          <div className="flex items-center gap-3 rounded-md bg-background/50 p-3 border">
            <Avatar className="size-10 border-2 border-background">
              <AvatarImage src={connectedAccount.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {connectedAccount.account_name?.substring(0, 2).toUpperCase() || platform.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">
                {connectedAccount.account_name || "Connected Account"}
              </span>
              {connectedAccount.expires_at && (
                <span className={cn(
                  "text-[10px] flex items-center gap-1",
                  isExpired ? "text-destructive" : "text-muted-foreground"
                )}>
                  {isExpired ? <AlertCircle className="size-3" /> : null}
                  Token: {isExpired ? "Expired" : "Active"}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[66px] flex items-center justify-center border border-dashed rounded-md text-muted-foreground text-xs italic">
            Ready to connect
          </div>
        )}
      </CardContent>

      <CardFooter>
        {isConnected ? (
          <Button 
            variant="outline" 
            className="w-full gap-2 border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? <Loader className="size-4 animate-spin" /> : <Unlink2 className="size-4" />}
            Disconnect
          </Button>
        ) : (
          <Button 
            className="w-full gap-2"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            Connect {platform.name}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
