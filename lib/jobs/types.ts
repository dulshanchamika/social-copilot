export interface PublishJobData {
  postId: string;
}

export interface AutoReplierJobData {
  ruleId: string;
  commentId: string;
  commentText: string;
  platformPostId: string;
  postContent?: string;
}

export interface TokenRefresherJobData {}

export interface CommentWatcherJobData {}

export interface AnalyticsSyncerJobData {}
