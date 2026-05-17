"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLATFORMS } from "@/lib/platforms";

interface TopPost {
  id: string;
  content: string;
  platform: string;
  reach: number;
  likes: number;
  comments: number;
  engagementRate: number;
}

interface TopPostsTableProps {
  posts: TopPost[];
}

export function TopPostsTable({ posts }: TopPostsTableProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No post data available for the selected period.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead className="text-right">Reach</TableHead>
            <TableHead className="text-right">Likes</TableHead>
            <TableHead className="text-right">Comments</TableHead>
            <TableHead className="text-right">Eng. Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const PlatformIcon = PLATFORMS[post.platform as keyof typeof PLATFORMS]?.icon;
            return (
              <TableRow key={post.id}>
                <TableCell className="font-medium max-w-[300px] truncate" title={post.content}>
                  {post.content}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {PlatformIcon && <PlatformIcon className="h-4 w-4" style={{ color: PLATFORMS[post.platform as keyof typeof PLATFORMS].color }} />}
                    <span className="capitalize">{PLATFORMS[post.platform as keyof typeof PLATFORMS]?.name || post.platform}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{post.reach.toLocaleString()}</TableCell>
                <TableCell className="text-right">{post.likes.toLocaleString()}</TableCell>
                <TableCell className="text-right">{post.comments.toLocaleString()}</TableCell>
                <TableCell className="text-right">{(post.engagementRate / 100).toFixed(2)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
