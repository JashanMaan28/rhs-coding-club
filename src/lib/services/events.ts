import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Rsvp } from '@/lib/firebase-collections';

export interface EventWithRsvps extends Event {
  rsvpCount: {
    yes: number;
    no: number;
    maybe: number;
    total: number;
  };
  userRsvp?: 'YES' | 'NO' | 'MAYBE' | null;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: Date;
  location: string;
  tags?: string[];
  coverImage?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export class EventService {
  private eventsCollection = collection(db, 'events');
  private rsvpsCollection = collection(db, 'rsvps');

  // Create a new event
  async createEvent(eventData: CreateEventData, createdBy: string): Promise<string> {
    const event: Omit<Event, 'id'> = {
      ...eventData,
      date: Timestamp.fromDate(eventData.date),
      createdBy,
      tags: eventData.tags || [],
    };

    const docRef = await addDoc(this.eventsCollection, event);
    return docRef.id;
  }

  // Update an existing event
  async updateEvent(eventData: UpdateEventData): Promise<void> {
    const { id, ...updates } = eventData;
    const eventRef = doc(this.eventsCollection, id);
    
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }

    await updateDoc(eventRef, updateData);
  }

  // Delete an event and all associated RSVPs
  async deleteEvent(eventId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete the event
    const eventRef = doc(this.eventsCollection, eventId);
    batch.delete(eventRef);
    
    // Delete all RSVPs for this event
    const rsvpQuery = query(this.rsvpsCollection, where('eventId', '==', eventId));
    const rsvpSnapshot = await getDocs(rsvpQuery);
    
    rsvpSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  // Batch-enrich events with RSVP data in minimal queries instead of N+1
  private async enrichEventsWithRsvps(
    eventDocs: Array<{ id: string; data: () => Record<string, unknown> }>,
    userId?: string
  ): Promise<EventWithRsvps[]> {
    if (eventDocs.length === 0) return [];

    const eventIds = eventDocs.map(d => d.id);
    const events = eventDocs.map(d => ({ id: d.id, ...d.data() }) as Event);

    // Batch fetch all RSVPs for these events (Firestore 'in' supports up to 30)
    const rsvpsByEvent: Record<string, { yes: number; no: number; maybe: number; total: number }> = {};
    const userRsvpByEvent: Record<string, 'YES' | 'NO' | 'MAYBE' | null> = {};

    // Initialize defaults
    for (const id of eventIds) {
      rsvpsByEvent[id] = { yes: 0, no: 0, maybe: 0, total: 0 };
      userRsvpByEvent[id] = null;
    }

    // Chunk eventIds into groups of 30 for Firestore 'in' query limit
    for (let i = 0; i < eventIds.length; i += 30) {
      const chunk = eventIds.slice(i, i + 30);
      const rsvpSnapshot = await getDocs(
        query(this.rsvpsCollection, where('eventId', 'in', chunk))
      );

      for (const rsvpDoc of rsvpSnapshot.docs) {
        const rsvp = rsvpDoc.data() as Rsvp;
        const counts = rsvpsByEvent[rsvp.eventId];
        if (counts) {
          counts.total++;
          if (rsvp.status === 'YES') counts.yes++;
          else if (rsvp.status === 'NO') counts.no++;
          else if (rsvp.status === 'MAYBE') counts.maybe++;
        }
        if (userId && rsvp.userId === userId) {
          userRsvpByEvent[rsvp.eventId] = rsvp.status;
        }
      }
    }

    return events.map(event => ({
      ...event,
      rsvpCount: rsvpsByEvent[event.id],
      userRsvp: userRsvpByEvent[event.id],
    }));
  }

  // Get all events with RSVP counts
  async getAllEvents(userId?: string): Promise<EventWithRsvps[]> {
    const eventsSnapshot = await getDocs(
      query(this.eventsCollection, orderBy('date', 'desc'))
    );
    return this.enrichEventsWithRsvps(eventsSnapshot.docs, userId);
  }

  // Get upcoming events
  async getUpcomingEvents(userId?: string, limitCount = 10): Promise<EventWithRsvps[]> {
    const now = Timestamp.now();
    const eventsSnapshot = await getDocs(
      query(
        this.eventsCollection,
        where('date', '>=', now),
        orderBy('date', 'asc'),
        limit(limitCount)
      )
    );
    return this.enrichEventsWithRsvps(eventsSnapshot.docs, userId);
  }

  // Get past events
  async getPastEvents(userId?: string, limitCount = 10): Promise<EventWithRsvps[]> {
    const now = Timestamp.now();
    const eventsSnapshot = await getDocs(
      query(
        this.eventsCollection,
        where('date', '<', now),
        orderBy('date', 'desc'),
        limit(limitCount)
      )
    );
    return this.enrichEventsWithRsvps(eventsSnapshot.docs, userId);
  }

  // Get events by tag
  async getEventsByTag(tag: string, userId?: string): Promise<EventWithRsvps[]> {
    const eventsSnapshot = await getDocs(
      query(
        this.eventsCollection,
        where('tags', 'array-contains', tag),
        orderBy('date', 'desc')
      )
    );
    return this.enrichEventsWithRsvps(eventsSnapshot.docs, userId);
  }

  // Get single event by ID
  async getEventById(eventId: string, userId?: string): Promise<EventWithRsvps | null> {
    const eventDoc = await getDoc(doc(this.eventsCollection, eventId));
    
    if (!eventDoc.exists()) {
      return null;
    }
    
    const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
    const rsvpCounts = await this.getRsvpCounts(eventId);
    const userRsvp = userId ? await this.getUserRsvp(eventId, userId) : null;
    
    return {
      ...eventData,
      rsvpCount: rsvpCounts,
      userRsvp,
    };
  }

  // RSVP to an event
  async rsvpToEvent(eventId: string, userId: string, status: 'YES' | 'NO' | 'MAYBE'): Promise<void> {
    const rsvpId = `${eventId}_${userId}`;
    const rsvpRef = doc(this.rsvpsCollection, rsvpId);
    
    const rsvpData: Rsvp = {
      eventId,
      userId,
      status,
    };
    
    await setDoc(rsvpRef, rsvpData);
  }

  // Remove RSVP
  async removeRsvp(eventId: string, userId: string): Promise<void> {
    const rsvpId = `${eventId}_${userId}`;
    const rsvpRef = doc(this.rsvpsCollection, rsvpId);
    await deleteDoc(rsvpRef);
  }

  // Get RSVP counts for an event
  private async getRsvpCounts(eventId: string): Promise<{
    yes: number;
    no: number;
    maybe: number;
    total: number;
  }> {
    const rsvpQuery = query(this.rsvpsCollection, where('eventId', '==', eventId));
    const rsvpSnapshot = await getDocs(rsvpQuery);
    
    const counts = { yes: 0, no: 0, maybe: 0, total: 0 };
    
    rsvpSnapshot.docs.forEach((doc) => {
      const rsvp = doc.data() as Rsvp;
      counts.total++;
      switch (rsvp.status) {
        case 'YES':
          counts.yes++;
          break;
        case 'NO':
          counts.no++;
          break;
        case 'MAYBE':
          counts.maybe++;
          break;
      }
    });
    
    return counts;
  }

  // Get user's RSVP for a specific event
  private async getUserRsvp(eventId: string, userId: string): Promise<'YES' | 'NO' | 'MAYBE' | null> {
    const rsvpId = `${eventId}_${userId}`;
    const rsvpDoc = await getDoc(doc(this.rsvpsCollection, rsvpId));
    
    if (!rsvpDoc.exists()) {
      return null;
    }
    
    const rsvp = rsvpDoc.data() as Rsvp;
    return rsvp.status;
  }

  // Get all tags used in events
  async getAllTags(): Promise<string[]> {
    const eventsSnapshot = await getDocs(this.eventsCollection);
    const tags = new Set<string>();
    
    eventsSnapshot.docs.forEach((doc) => {
      const event = doc.data() as Event;
      if (event.tags) {
        event.tags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags).sort();
  }
}

export const eventService = new EventService();

// Helper function to generate Google Calendar URL
export function generateGoogleCalendarUrl(event: Event): string {
  const startDate = event.date.toDate();
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: event.description,
    location: event.location,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
