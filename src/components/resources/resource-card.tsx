import React from 'react';
import { Resource } from '@/lib/firebase-collections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ResourceCardProps {
  resource: Resource;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'advanced':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

export const ResourceCard = React.memo(function ResourceCard({ resource, isBookmarked, onToggleBookmark }: ResourceCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 flex-1">{resource.title}</CardTitle>
            {onToggleBookmark && (
              <button
                type="button"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                onClick={() => onToggleBookmark(resource.id)}
                className={cn(
                  'p-1 rounded-md transition-colors border hover:bg-muted',
                  isBookmarked ? 'text-yellow-500' : 'text-muted-foreground'
                )}
              >
                <Star className={cn('h-4 w-4', isBookmarked ? 'fill-yellow-500/70' : 'fill-none')} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={getLevelColor(resource.level)}>
              {resource.level.charAt(0).toUpperCase() + resource.level.slice(1)}
            </Badge>
            {resource.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {resource.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{resource.tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {resource.description}
          </p>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Resource
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
