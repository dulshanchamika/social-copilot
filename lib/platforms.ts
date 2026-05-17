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
  canPublish: boolean;
  canReply: boolean;
  revokeToken?: (accessToken: string, clientId: string, clientSecret: string) => Promise<void>;
  publish: (accessToken: string, content: string, mediaUrls?: string[]) => Promise<string>;
  fetchComments?: (accessToken: string, platformPostId: string) => Promise<{ id: string, text: string }[]>;
  postReply?: (accessToken: string, platformPostId: string, commentId: string, replyText: string) => Promise<string>;
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
    canPublish: false,
    canReply: false,
    publish: async () => {
      throw new Error("Instagram publishing is not yet implemented");
    },
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    icon: Video,
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    canPublish: false,
    canReply: false,
    revokeToken: async (token) => {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    },
    publish: async () => {
      throw new Error("YouTube publishing is not yet implemented");
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
    canPublish: false,
    canReply: false,
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_key: clientId, client_secret: clientSecret }),
      });
    },
    publish: async () => {
      throw new Error("TikTok publishing is not yet implemented");
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
    canPublish: false,
    canReply: false,
    revokeToken: async (token) => {
      await fetch(`https://graph.facebook.com/v12.0/me/permissions?access_token=${token}`, {
        method: "DELETE",
      });
    },
    publish: async () => {
      throw new Error("Facebook publishing is not yet implemented");
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
    canPublish: false,
    canReply: false,
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://www.linkedin.com/oauth/v2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_id: clientId, client_secret: clientSecret }),
      });
    },
    publish: async () => {
      throw new Error("LinkedIn publishing is not yet implemented");
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
    canPublish: false,
    canReply: false,
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
    publish: async () => {
      throw new Error("Pinterest publishing is not yet implemented");
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
    canPublish: false,
    canReply: false,
    revokeToken: async (token, clientId, clientSecret) => {
      await fetch("https://discord.com/api/oauth2/token/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_id: clientId, client_secret: clientSecret }),
      });
    },
    publish: async () => {
      throw new Error("Discord publishing is not yet implemented");
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
    canPublish: true,
    canReply: true,
    revokeToken: async (token, clientId) => {
      await fetch("https://api.twitter.com/2/oauth2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, client_id: clientId, token_type_hint: "access_token" }),
      });
    },
    publish: async (token, content) => {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "X API error");
      }
      return data.data.id;
    },
    fetchComments: async (token, platformPostId) => {
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=conversation_id:${platformPostId}&tweet.fields=author_id,created_at,text`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        // Handle cases where search might not be available or no results found
        if (res.status === 400) return [];
        throw new Error(data.detail || data.message || "X API error fetching comments");
      }
      return (data.data || [])
        .filter((tweet: { id: string }) => tweet.id !== platformPostId) // Don't include the post itself
        .map((tweet: { id: string; text: string }) => ({
          id: tweet.id,
          text: tweet.text,
        }));
    },
    postReply: async (token, platformPostId, commentId, replyText) => {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: replyText,
          reply: {
            in_reply_to_tweet_id: commentId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "X API error posting reply");
      }
      return data.data.id;
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
    canPublish: false,
    canReply: false,
    revokeToken: async (token) => {
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${token}`
        },
      });
    },
    publish: async () => {
      throw new Error("Slack publishing is not yet implemented");
    },
  },
};
