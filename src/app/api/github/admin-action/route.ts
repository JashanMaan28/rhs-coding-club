import { NextRequest, NextResponse } from 'next/server';
import { githubService } from '@/lib/services/github';
import { verifyAdminOrOfficer } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminOrOfficer(req);
    if (!authResult.authorized) return authResult.response;

    const { action, githubUsername, requestId, adminNotes } = await req.json();

    if (!action || !githubUsername || !requestId) {
      return NextResponse.json({ 
        error: 'Action, GitHub username, and request ID are required' 
      }, { status: 400 });
    }

    if (action === 'approve') {
      // Try to invite the user to the organization
      const inviteResult = await githubService.inviteUserToOrganization(githubUsername);
      
      return NextResponse.json({
        success: inviteResult.success,
        message: inviteResult.message,
        status: inviteResult.success ? 'invite-sent' : 'approved',
        adminNotes,
        inviteError: inviteResult.success ? null : inviteResult.message,
      });
    } else if (action === 'deny') {
      return NextResponse.json({
        success: true,
        message: `Request denied for ${githubUsername}`,
        status: 'denied',
        adminNotes,
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "approve" or "deny"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing admin action:', error);
    return NextResponse.json({ 
      error: 'Failed to process admin action' 
    }, { status: 500 });
  }
}