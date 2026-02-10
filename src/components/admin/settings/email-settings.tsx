'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { 
  getEmailSettings, 
  updateEmailSettings, 
  initializeEmailSettings,
  EmailSettings 
} from '@/lib/services/settings';
import { Save, Loader2, Mail, Bell, Clock, FileText, Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function EmailSettingsComponent() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    replyToEmail: '',
    notifications: {
      newChallenge: true,
      challengeReminder: true,
      eventReminder: true,
      weeklyDigest: false,
      projectApproval: true,
    },
    reminderTiming: {
      challengeDeadline: 24,
      eventStart: 2,
    },
    templates: {
      welcome: '',
      challengeNotification: '',
      eventReminder: '',
    },
  });

  const [initialData, setInitialData] = useState(formData);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(changed);
  }, [formData, initialData]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      let settings = await getEmailSettings();
      
      if (!settings && userProfile?.uid) {
        await initializeEmailSettings(userProfile.uid);
        settings = await getEmailSettings();
      }

      if (settings) {
        const data = {
          senderName: settings.senderName || '',
          senderEmail: settings.senderEmail || '',
          replyToEmail: settings.replyToEmail || '',
          notifications: {
            newChallenge: settings.notifications?.newChallenge ?? true,
            challengeReminder: settings.notifications?.challengeReminder ?? true,
            eventReminder: settings.notifications?.eventReminder ?? true,
            weeklyDigest: settings.notifications?.weeklyDigest ?? false,
            projectApproval: settings.notifications?.projectApproval ?? true,
          },
          reminderTiming: {
            challengeDeadline: settings.reminderTiming?.challengeDeadline ?? 24,
            eventStart: settings.reminderTiming?.eventStart ?? 2,
          },
          templates: {
            welcome: settings.templates?.welcome || '',
            challengeNotification: settings.templates?.challengeNotification || '',
            eventReminder: settings.templates?.eventReminder || '',
          },
        };
        setFormData(data);
        setInitialData(data);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
      alert('Failed to load email settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as Record<string, string | number | boolean>),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.uid) {
      alert('You must be logged in to update settings.');
      return;
    }

    try {
      setSaving(true);
      
      await updateEmailSettings(formData, userProfile.uid);
      
      setInitialData(formData);
      setHasChanges(false);
      
      alert('Email settings updated successfully!');
    } catch (error) {
      console.error('Error saving email settings:', error);
      alert('Failed to save email settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(initialData);
    setHasChanges(false);
  };

  const handleTestEmail = async () => {
    if (!userProfile?.email) {
      alert('You must be logged in to send a test email.');
      return;
    }

    try {
      setTestEmailLoading(true);
      
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          recipientEmail: userProfile.email,
          recipientName: userProfile.displayName || 'Admin',
        }),
      });

      if (response.ok) {
        setTestEmailSent(true);
        setTimeout(() => setTestEmailSent(false), 5000);
        alert(`Test email sent to ${userProfile.email}!`);
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email. Please check your email configuration.');
    } finally {
      setTestEmailLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading email settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email & Notification Settings
            </CardTitle>
            <CardDescription className="mt-2">
              Configure email delivery, notification preferences, and email templates
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">Email Configuration</h3>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Email delivery is powered by Brevo. Ensure BREVO_API_KEY is configured in your environment variables.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="senderName">
                  Sender Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="senderName"
                  value={formData.senderName}
                  onChange={(e) => handleChange('senderName', e.target.value)}
                  placeholder="RHS Coding Club"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Name shown in the &quot;From&quot; field of emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderEmail">
                  Sender Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={formData.senderEmail}
                  onChange={(e) => handleChange('senderEmail', e.target.value)}
                  placeholder="noreply@rhscoding.club"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be verified in Brevo
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyToEmail">
                Reply-To Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="replyToEmail"
                type="email"
                value={formData.replyToEmail}
                onChange={(e) => handleChange('replyToEmail', e.target.value)}
                placeholder="contact@rhscodingclub.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Where replies to automated emails will be sent
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestEmail}
                disabled={testEmailLoading || !formData.senderEmail}
                className="gap-2"
              >
                {testEmailLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>
              {testEmailSent && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  ✓ Test email sent successfully!
                </p>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Control which automated notifications are sent to members
            </p>

            <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newChallenge" className="text-base font-medium">
                    New Challenge Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notify members when a new coding challenge is published
                  </p>
                </div>
                <Switch
                  id="newChallenge"
                  checked={formData.notifications.newChallenge}
                  onCheckedChange={(checked) => 
                    handleNestedChange('notifications', 'newChallenge', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="challengeReminder" className="text-base font-medium">
                    Challenge Deadline Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders before challenge deadlines
                  </p>
                </div>
                <Switch
                  id="challengeReminder"
                  checked={formData.notifications.challengeReminder}
                  onCheckedChange={(checked) => 
                    handleNestedChange('notifications', 'challengeReminder', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="eventReminder" className="text-base font-medium">
                    Event Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Remind members about upcoming events
                  </p>
                </div>
                <Switch
                  id="eventReminder"
                  checked={formData.notifications.eventReminder}
                  onCheckedChange={(checked) => 
                    handleNestedChange('notifications', 'eventReminder', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weeklyDigest" className="text-base font-medium">
                    Weekly Digest
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send weekly summary of club activities
                  </p>
                </div>
                <Switch
                  id="weeklyDigest"
                  checked={formData.notifications.weeklyDigest}
                  onCheckedChange={(checked) => 
                    handleNestedChange('notifications', 'weeklyDigest', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="projectApproval" className="text-base font-medium">
                    Project Approval Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notify members when their project is approved
                  </p>
                </div>
                <Switch
                  id="projectApproval"
                  checked={formData.notifications.projectApproval}
                  onCheckedChange={(checked) => 
                    handleNestedChange('notifications', 'projectApproval', checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Reminder Timing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold">Reminder Timing</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure when reminder notifications are sent
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="challengeDeadline">
                  Challenge Deadline Reminder (hours before)
                </Label>
                <Input
                  id="challengeDeadline"
                  type="number"
                  min="1"
                  max="168"
                  value={formData.reminderTiming.challengeDeadline}
                  onChange={(e) => 
                    handleNestedChange('reminderTiming', 'challengeDeadline', parseInt(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formData.reminderTiming.challengeDeadline} hours 
                  ({Math.round(formData.reminderTiming.challengeDeadline / 24 * 10) / 10} days)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventStart">
                  Event Start Reminder (hours before)
                </Label>
                <Input
                  id="eventStart"
                  type="number"
                  min="1"
                  max="72"
                  value={formData.reminderTiming.eventStart}
                  onChange={(e) => 
                    handleNestedChange('reminderTiming', 'eventStart', parseInt(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formData.reminderTiming.eventStart} hours
                </p>
              </div>
            </div>
          </div>

          {/* Email Templates */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold">Email Templates</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Customize email templates. Use variables like {'{{clubName}}'}, {'{{userName}}'}, etc.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeTemplate">
                  Welcome Email Template
                </Label>
                <Textarea
                  id="welcomeTemplate"
                  value={formData.templates.welcome}
                  onChange={(e) => handleNestedChange('templates', 'welcome', e.target.value)}
                  placeholder="Welcome {{userName}} to {{clubName}}! We're excited to have you..."
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{{clubName}}'}, {'{{userName}}'}, {'{{userEmail}}'} 
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="challengeTemplate">
                  New Challenge Notification Template
                </Label>
                <Textarea
                  id="challengeTemplate"
                  value={formData.templates.challengeNotification}
                  onChange={(e) => handleNestedChange('templates', 'challengeNotification', e.target.value)}
                  placeholder="A new challenge has been posted: {{challengeName}}..."
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{{challengeName}}'}, {'{{difficulty}}'}, {'{{deadline}}'}, {'{{points}}'} 
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventReminderTemplate">
                  Event Reminder Template
                </Label>
                <Textarea
                  id="eventReminderTemplate"
                  value={formData.templates.eventReminder}
                  onChange={(e) => handleNestedChange('templates', 'eventReminder', e.target.value)}
                  placeholder="Reminder: {{eventName}} is coming up on {{eventDate}}..."
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{{eventName}}'}, {'{{eventDate}}'}, {'{{eventLocation}}'}, {'{{eventTime}}'} 
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
            <Button
              type="submit"
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              Reset Changes
            </Button>

            {hasChanges && (
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2 sm:ml-auto">
                <AlertCircle className="h-4 w-4" />
                You have unsaved changes
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
