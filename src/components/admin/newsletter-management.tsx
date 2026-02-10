'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, Send, History } from 'lucide-react';
import { toast } from 'sonner';
import { getDocs } from 'firebase/firestore';
import { newsletterSubscribersCollection } from '@/lib/firebase-collections';
import { useAuth } from '@/contexts/auth-context';

export function NewsletterManagement() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load subscriber count
  useEffect(() => {
    const loadSubscriberCount = async () => {
      try {
        const querySnapshot = await getDocs(newsletterSubscribersCollection);
        setSubscriberCount(querySnapshot.size);
      } catch (error) {
        console.error('Error loading subscriber count:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscriberCount();
  }, []);

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setSending(true);

    try {
      // Send newsletter via API
      const token = await user?.getIdToken();
      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Newsletter sent to ${data.recipientCount} subscribers!`);
        setSubject('');
        setMessage('');
      } else {
        toast.error(data.error || 'Failed to send newsletter');
      }
    } catch (error) {
      console.error('Error sending newsletter:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Newsletter Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {loading ? '...' : subscriberCount}
              </div>
              <div className="text-sm text-muted-foreground">Total Subscribers</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">Active</div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                <Mail className="h-6 w-6 mx-auto" />
              </div>
              <div className="text-sm text-muted-foreground">Ready to Send</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compose Newsletter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Newsletter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendNewsletter} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                placeholder="Enter newsletter subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={sending}
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                {subject.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your newsletter content here...

You can include:
• Club announcements
• Upcoming events
• Coding tips and resources
• Member spotlights
• And more!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={sending}
                className="min-h-[300px]"
              />
              <p className="text-sm text-muted-foreground">
                {message.length} characters • Line breaks will be preserved in the email
              </p>
            </div>

            {/* Preview Section */}
            {(subject || message) && (
              <div className="space-y-2">
                <Label>Email Preview</Label>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-60 overflow-y-auto">
                  <div className="text-sm font-semibold mb-2">Subject: {subject || 'No subject'}</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {message || 'No message content'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                This will be sent to <Badge variant="secondary">{subscriberCount} subscribers</Badge>
              </div>
              <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
                {sending ? (
                  <>
                    <Mail className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Newsletter
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Newsletter Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <strong>Keep it concise:</strong> Newsletters work best when they&apos;re informative but not overwhelming.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <strong>Include a call-to-action:</strong> Encourage readers to visit your website, join events, or participate in challenges.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <strong>Regular cadence:</strong> Send newsletters consistently (weekly, bi-weekly, or monthly) to keep subscribers engaged.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <strong>Personal touch:</strong> Write in a friendly, conversational tone that reflects your club&apos;s personality.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
