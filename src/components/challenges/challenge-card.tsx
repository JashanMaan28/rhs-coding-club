'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Challenge } from '@/lib/firebase-collections';

interface ChallengeCardProps {
  challenge: Challenge;
  userSubmission?: { status: string } | null;
}

export const ChallengeCard = React.memo(function ChallengeCard({ challenge, userSubmission }: ChallengeCardProps) {
  const getDifficultyVariant = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'hard':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusBadge = () => {
    if (!userSubmission) return null;
    
    switch (userSubmission.status) {
      case 'pass':
        return <Badge variant="default" className="bg-green-500">Passed</Badge>;
      case 'fail':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Under Review</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{challenge.title}</CardTitle>
              {getStatusBadge()}
            </div>
            <p className="text-muted-foreground line-clamp-2">{challenge.description}</p>
          </div>
          <Badge variant={getDifficultyVariant(challenge.difficulty)}>
            {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Week {challenge.weekNo}
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {challenge.points} points
            </div>
          </div>
          <Link href={`/challenges/${challenge.id}`}>
            <Button variant="outline">
              {userSubmission ? 'View Details' : 'Start Challenge'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});
