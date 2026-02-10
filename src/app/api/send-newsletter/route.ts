import { brevoService } from '@/lib/brevo';
import { newsletterSubscribersCollection } from '@/lib/firebase-collections';
import { NextRequest, NextResponse } from 'next/server';
import { getDocs } from 'firebase/firestore';
import { verifyAdminOrOfficer } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminOrOfficer(req);
    if (!authResult.authorized) return authResult.response;

    const { subject, message } = await req.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    // Get all newsletter subscribers
    const subscribersSnapshot = await getDocs(newsletterSubscribersCollection);
    const subscriberEmails = subscribersSnapshot.docs.map(doc => doc.data().email);

    if (subscriberEmails.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No newsletter subscribers to send to',
        recipientCount: 0
      });
    }

    // Send custom newsletter to all subscribers
    const success = await brevoService.sendCustomNewsletter(
      subscriberEmails,
      subject.trim(),
      message.trim()
    );

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Newsletter sent successfully',
        recipientCount: subscriberEmails.length
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send newsletter' 
      }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
