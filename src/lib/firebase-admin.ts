import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();

/**
 * Verify that a request comes from an authenticated user with an admin or officer role.
 * Returns the decoded token and user role on success, or a NextResponse error on failure.
 */
export async function verifyAdminOrOfficer(
  req: NextRequest
): Promise<
  | { authorized: true; uid: string; role: string }
  | { authorized: false; response: NextResponse }
> {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const role = userDoc.data()?.role;

    if (role !== 'admin' && role !== 'officer') {
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }

    return { authorized: true, uid: decodedToken.uid, role };
  } catch {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    };
  }
}
