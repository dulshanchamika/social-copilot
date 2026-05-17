import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerk_id: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  plan: text("plan").default("free").notNull(), // 'free', 'pro', 'business'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const social_accounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  platform: text("platform").notNull(), // 'instagram', 'youtube', etc.
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  account_name: text("account_name"),
  avatar_url: text("avatar_url"),
  expires_at: timestamp("expires_at"),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  media_urls: text("media_urls").array(),
  platforms: text("platforms").array().notNull(),
  account_ids: uuid("account_ids").array().notNull(),
  status: text("status").default("draft").notNull(), // 'draft', 'scheduled', 'published', 'failed'
  scheduled_at: timestamp("scheduled_at"),
  published_at: timestamp("published_at"),
});

export const post_platform_results = pgTable("post_platform_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  post_id: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  account_id: uuid("account_id").references(() => social_accounts.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  platform_post_id: text("platform_post_id"),
  status: text("status").notNull(), // 'published', 'failed'
  error: text("error"),
});

export const auto_reply_rules = pgTable("auto_reply_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  platform: text("platform").notNull(),
  account_id: uuid("account_id").references(() => social_accounts.id, { onDelete: "cascade" }).notNull(),
  trigger_type: text("trigger_type").notNull(), // 'keyword', 'any'
  keywords: text("keywords").array(),
  reply_template: text("reply_template"),
  use_ai: boolean("use_ai").default(false).notNull(),
  tone: text("tone"), // 'friendly', 'professional', 'witty', 'custom'
  is_active: boolean("is_active").default(true).notNull(),
});

export const auto_reply_logs = pgTable("auto_reply_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  rule_id: uuid("rule_id").references(() => auto_reply_rules.id, { onDelete: "cascade" }).notNull(),
  comment_id: text("comment_id").notNull().unique(),
  comment_text: text("comment_text"),
  reply_sent: text("reply_sent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const media_assets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  imagekit_file_id: text("imagekit_file_id").notNull(),
  url: text("url").notNull(),
  type: text("type"), // 'image', 'video'
  size: integer("size"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  social_accounts: many(social_accounts),
  posts: many(posts),
  auto_reply_rules: many(auto_reply_rules),
  media_assets: many(media_assets),
}));

export const socialAccountsRelations = relations(social_accounts, ({ one }) => ({
  user: one(users, { fields: [social_accounts.user_id], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.user_id], references: [users.id] }),
  platform_results: many(post_platform_results),
}));

export const postPlatformResultsRelations = relations(post_platform_results, ({ one }) => ({
  post: one(posts, { fields: [post_platform_results.post_id], references: [posts.id] }),
}));

export const autoReplyRulesRelations = relations(auto_reply_rules, ({ one, many }) => ({
  user: one(users, { fields: [auto_reply_rules.user_id], references: [users.id] }),
  account: one(social_accounts, { fields: [auto_reply_rules.account_id], references: [social_accounts.id] }),
  logs: many(auto_reply_logs),
}));

export const autoReplyLogsRelations = relations(auto_reply_logs, ({ one }) => ({
  rule: one(auto_reply_rules, { fields: [auto_reply_logs.rule_id], references: [auto_reply_rules.id] }),
}));

export const mediaAssetsRelations = relations(media_assets, ({ one }) => ({
  user: one(users, { fields: [media_assets.user_id], references: [users.id] }),
}));
