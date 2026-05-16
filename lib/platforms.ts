import { 
  Camera, 
  Video, 
  MessageCircle, 
  Briefcase, 
  X, 
  Hash, 
  Gamepad2, 
  Music, 
  Pin
} from "lucide-react";

export type PlatformId = 
  | "instagram" 
  | "youtube" 
  | "tiktok" 
  | "facebook" 
  | "linkedin" 
  | "pinterest" 
  | "discord" 
  | "x" 
  | "slack";

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  color: string;
  icon: any;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  revokeToken?: (accessToken: string, clientId: string, clientSecret: string) => Promise<void>;
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#E4405F",
    icon: Camera,
    scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_comments"],
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    icon: Video,
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeToken: async (token) => {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    },
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    color: "#000000",
    icon: Music,
    scopes: ["user.info.basic", "video.upload", "video.list"],
    authUrl: "https://www.tiktok.com/auth/authorize/",
    tokenUrl: "https://open-api.tiktok.com/oauth/access_token/",
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_key: clientId, client_secret: clientSecret }),
      });
    },
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    icon: MessageCircle,
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    authUrl: "https://www.facebook.com/v12.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v12.0/oauth/access_token",
    revokeToken: async (token) => {
      await fetch(`https://graph.facebook.com/v12.0/me/permissions?access_token=${token}`, {
        method: "DELETE",
      });
    },
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    icon: Briefcase,
    scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://www.linkedin.com/oauth/v2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_id: clientId, client_secret: clientSecret }),
      });
    },
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    color: "#BD081C",
    icon: Pin,
    scopes: ["boards:read", "pins:read", "pins:write"],
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://api.pinterest.com/v5/oauth/revoke", {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
        },
        body: new URLSearchParams({ token }),
      });
    },
  },
  discord: {
    id: "discord",
    name: "Discord",
    color: "#5865F2",
    icon: Gamepad2,
    scopes: ["identify", "guilds", "webhook.incoming"],
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://discord.com/api/oauth2/token/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_id: clientId, client_secret: clientSecret }),
      });
    },
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    color: "#000000",
    icon: X,
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    revokeToken: async (token, clientId) => {
      await fetch("https://api.twitter.com/2/oauth2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_id: clientId, token_type_hint: "access_token" }),
      });
    },
  },
  slack: {
    id: "slack",
    name: "Slack",
    color: "#4A154B",
    icon: Hash,
    scopes: ["incoming-webhook", "chat:write"],
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    revokeToken: async (token) => {
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${token}`
        },
      });
    },
  },
};
