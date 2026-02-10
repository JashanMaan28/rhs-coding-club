import { brevoService } from '@/lib/brevo';
import { newsletterSubscribersCollection } from '@/lib/firebase-collections';
import { NextRequest, NextResponse } from 'next/server';
import { getDocs } from 'firebase/firestore';
import { verifyAdminOrOfficer } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminOrOfficer(req);
    if (!authResult.authorized) return authResult.response;

    const { challengeTitle, challengeDescription, challengeDifficulty, challengePoints, challengeUrl } = await req.json();

    if (!challengeTitle || !challengeDescription || !challengeDifficulty || !challengePoints || !challengeUrl) {
      return NextResponse.json({ error: 'Missing required challenge information' }, { status: 400 });
    }

    console.log('Sending new challenge notification for:', challengeTitle);

    // Get all newsletter subscribers
    const subscribersSnapshot = await getDocs(newsletterSubscribersCollection);
    const subscriberEmails = subscribersSnapshot.docs.map(doc => doc.data().email);

    if (subscriberEmails.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No newsletter subscribers to notify' 
      });
    }

    // Send notifications to all subscribers
    const success = await brevoService.sendNewChallengeNotification(
      subscriberEmails,
      challengeTitle,
      challengeDescription,
      challengeDifficulty,
      challengePoints,
      challengeUrl
    );

    if (success) {
      console.log(`Challenge notification sent to ${subscriberEmails.length} subscribers`);
      return NextResponse.json({ 
        success: true, 
        message: `Notification sent to ${subscriberEmails.length} subscribers` 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send challenge notifications' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Challenge notification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
