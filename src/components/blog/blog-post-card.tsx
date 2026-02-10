import React from 'react';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Post } from '@/lib/firebase-collections';
import { CalendarDays, User } from 'lucide-react';

interface BlogPostCardProps {
  post: Post;
  showStatus?: boolean; // For admin view
}

export const BlogPostCard = React.memo(function BlogPostCard({ post, showStatus = false }: BlogPostCardProps) {
  const publishedDate = post.createdAt.toDate();
  const timeAgo = formatDistance(publishedDate, new Date(), { addSuffix: true });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {post.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {showStatus && (
                <Badge variant={post.published ? "default" : "secondary"}>
                  {post.published ? "Published" : "Draft"}
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-xl md:text-2xl line-clamp-2">
            <Link 
              href={`/blog/${post.slug || post.id}`} 
              className="hover:underline decoration-2 underline-offset-2"
            >
              {post.title}
            </Link>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-3">
          {post.summary}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{post.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
