'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, ExternalLink } from 'lucide-react';
import { EventWithRsvps, generateGoogleCalendarUrl } from '@/lib/services/events';
import { RSVPButton } from './rsvp-button';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: EventWithRsvps;
  onRsvpChange?: () => void;
  showRsvpButton?: boolean;
  compact?: boolean;
}

export const EventCard = React.memo(function EventCard({
  event,
  onRsvpChange,
  showRsvpButton = true,
  compact = false,
}: EventCardProps) {
  const eventDate = event.date.toDate();
  const isPastEvent = eventDate < new Date();
  const googleCalendarUrl = generateGoogleCalendarUrl(event);

  return (
    <Card className={cn("transition-shadow hover:shadow-md", compact && "p-3")}>
      <CardHeader className={cn("space-y-3", compact && "p-3 pb-2")}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Link
              href={`/events/${event.id}`}
              className="block group"
            >
              <CardTitle className={cn(
                "group-hover:text-primary transition-colors",
                compact ? "text-lg" : "text-xl"
              )}>
                {event.title}
              </CardTitle>
            </Link>
            <div className="flex flex-wrap gap-2">
              {event.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {isPastEvent && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Past Event
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {showRsvpButton && !isPastEvent && (
              <RSVPButton
                eventId={event.id}
                currentRsvp={event.userRsvp}
                onRsvpChange={onRsvpChange}
                size={compact ? "sm" : "default"}
              />
            )}
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              onClick={() => window.open(googleCalendarUrl, '_blank')}
              className="gap-2"
              aria-label="Add to Google Calendar"
            >
              <ExternalLink className="h-4 w-4" />
              {compact ? "" : "Add to Calendar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-3", compact && "p-3 pt-0")}>
        {!compact && (
          <p className="text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {format(eventDate, 'MMM d, yyyy')} at {format(eventDate, 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {event.rsvpCount.yes} going
              {event.rsvpCount.maybe > 0 && `, ${event.rsvpCount.maybe} maybe`}
            </span>
          </div>
        </div>
        {!compact && (
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-muted-foreground">
              {event.rsvpCount.total} total responses
            </div>
            <Link href={`/events/${event.id}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                View Details
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
