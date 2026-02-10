'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Github, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  ExternalLink,
  User,
  Calendar
} from 'lucide-react';
import { RotateCw } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GitHubMembershipRequest } from '@/lib/firebase-collections';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'invite-sent': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'already-member': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'already-invited': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  joined: 'bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-300',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  denied: XCircle,
  'invite-sent': Mail,
  'already-member': CheckCircle,
  'already-invited': Mail,
  joined: CheckCircle,
};

export function GitHubMembershipManagement() {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<GitHubMembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<GitHubMembershipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dialogMode, setDialogMode] = useState<'review' | 'view'>('view');

  useEffect(() => {
    const q = query(
      collection(db, 'githubMembershipRequests'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as GitHubMembershipRequest[];
      
      setRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async (request: GitHubMembershipRequest, action: 'approve' | 'deny') => {
    if (!userProfile) return;

    setIsProcessing(true);

    try {
      // Call API to handle GitHub operations
      const token = await user?.getIdToken();
      const response = await fetch('/api/github/admin-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          action,
          githubUsername: request.githubUsername,
          requestId: request.id,
          adminNotes: adminNotes.trim(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || `Failed to ${action} request`);
        return;
      }

      // Update request in Firestore
      // Allow Firestore serverTimestamp() FieldValue for timestamp fields
      const updateData: Partial<GitHubMembershipRequest> & Record<string, unknown> = {
        status: result.status,
        adminNotes: adminNotes.trim() || undefined,
        reviewedBy: userProfile.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (result.inviteError) {
        updateData.inviteError = result.inviteError;
      }

      if (result.status === 'invite-sent') {
        updateData.inviteSentAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'githubMembershipRequests', request.id), updateData);

      toast.success(result.message);
      setDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');

    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`Failed to ${action} request. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openDialog = (request: GitHubMembershipRequest, mode: 'review' | 'view') => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setDialogMode(mode);
    setDialogOpen(true);
  };

  type SimpleTimestamp = { seconds: number } | { toDate: () => Date } | { seconds: number; nanoseconds?: number } | null | undefined | unknown;

  const hasSeconds = (val: unknown): val is { seconds: number } => {
    return (
      typeof val === 'object' &&
      val !== null &&
      'seconds' in (val as Record<string, unknown>) &&
      typeof (val as { seconds?: unknown }).seconds === 'number'
    );
  };

  const hasToDate = (val: unknown): val is { toDate: () => Date } => {
    return (
      typeof val === 'object' &&
      val !== null &&
      'toDate' in (val as Record<string, unknown>) &&
      typeof (val as { toDate?: unknown }).toDate === 'function'
    );
  };

  const formatDate = (timestamp: SimpleTimestamp) => {
    if (!timestamp) return 'N/A';
    if (hasSeconds(timestamp)) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    if (hasToDate(timestamp)) {
      return timestamp.toDate().toLocaleString();
    }
    return 'N/A';
  };

  const getStatusIcon = (status: string) => {
    const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const canSyncStatus = (status: string) => ['invite-sent', 'already-invited', 'approved'].includes(status);

  const handleSync = async (request: GitHubMembershipRequest) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/github/check-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUsername: request.githubUsername })
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to sync status');
      } else if (data.status === 'joined') {
        await updateDoc(doc(db, 'githubMembershipRequests', request.id), {
          status: 'joined',
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Status updated to joined');
      } else if (data.status === 'invite-sent') {
        toast.info('Invitation still pending acceptance');
      } else if (data.status === 'not-invited') {
        toast.warning('User is neither invited nor a member; consider re-sending invite');
      }
    } catch (err) {
      console.error('Error syncing membership status', err);
      toast.error('Error syncing membership status');
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Membership Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Pending GitHub Membership Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending membership requests
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>GitHub Username</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.userEmail}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {request.userId.slice(-8)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        <a
                          href={`https://github.com/${request.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {request.githubUsername}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(request.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-[200px] truncate">
                        {request.note || 'No note'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(request, 'review')}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Requests History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Requests History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No membership requests found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>GitHub Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.userEmail}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {request.userId.slice(-8)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        <a
                          href={`https://github.com/${request.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white-600 hover:underline flex items-center gap-1"
                        >
                          {request.githubUsername}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${STATUS_COLORS[request.status]} flex items-center gap-1 w-fit`}
                        variant="secondary"
                      >
                        {getStatusIcon(request.status)}
                        {request.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(request.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {request.reviewedAt ? formatDate(request.reviewedAt) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(request, 'view')}
                        >
                          View
                        </Button>
                        {canSyncStatus(request.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Sync Status"
                            disabled={isSyncing}
                            onClick={() => handleSync(request)}
                          >
                            {isSyncing ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Review GitHub Membership Request
            </DialogTitle>
            <DialogDescription>
              Review and take action on this membership request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">User Email</Label>
                  <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                    {selectedRequest.userEmail}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">GitHub Username</Label>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/${selectedRequest.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm font-mono bg-muted/50 px-2 py-1 rounded"
                    >
                      <Github className="h-3 w-3" />
                      {selectedRequest.githubUsername}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Request Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedRequest.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Current Status</Label>
                  <Badge 
                    className={`${STATUS_COLORS[selectedRequest.status]} flex items-center gap-1 w-fit`}
                    variant="outline"
                  >
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>

              {/* User's Note */}
              {selectedRequest.note && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">User&apos;s Message</Label>
                  <div className="text-sm bg-muted/50 p-3 rounded border italic">
                    &quot;{selectedRequest.note}&quot;
                  </div>
                </div>
              )}

              {/* Previous Error */}
              {selectedRequest.inviteError && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-destructive">Previous Invite Error</Label>
                  <div className="text-sm bg-destructive/10 border border-destructive/20 p-3 rounded">
                    {selectedRequest.inviteError}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="adminNotes" className="text-sm font-medium">
                  Admin Notes
                </Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add notes about this request..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className={`resize-none ${dialogMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={dialogMode === 'view'}
                />
              </div>

              {/* Action Buttons */}
              {dialogMode === 'review' && selectedRequest.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleAction(selectedRequest, 'approve')}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Invite
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction(selectedRequest, 'deny')}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny Request
                  </Button>
                </div>
              )}

              {dialogMode === 'review' && selectedRequest.status === 'approved' && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => handleAction(selectedRequest, 'approve')}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Sending Invite...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send GitHub Invite
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selectedRequest && canSyncStatus(selectedRequest.status) && (
                <div className="pt-4 border-t flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={() => handleSync(selectedRequest)}
                    variant="outline"
                    disabled={isSyncing}
                    className="w-full"
                  >
                    {isSyncing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Syncing Status...
                      </>
                    ) : (
                      <>
                        <RotateCw className="h-4 w-4 mr-2" />
                        Sync Status with GitHub
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center -mt-2">Checks GitHub org membership & invitation live</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}