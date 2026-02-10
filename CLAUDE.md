# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the RHS Coding Club website - a Next.js 15 (App Router) application built with TypeScript, Firebase, and Tailwind CSS. It serves as a hub for club members to participate in challenges, view events, showcase projects, and track their progress through a gamified badge system.

## Development Commands

**Core Commands:**
- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server

**Code Quality:**
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without modifying files
- `npm run type-check` - Run TypeScript type checking (no build)

**Database Seeding:**
- `npm run seed:challenges` - Seed challenge data to Firestore
- `npm run seed:blog` - Seed blog posts to Firestore

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router) with Turbopack
- **Language**: TypeScript
- **Backend/Database**: Firebase (Firestore, Auth, Storage, Functions)
- **Authentication**: Firebase Auth with Google/GitHub OAuth
- **Email Service**: Brevo (formerly SendInBlue)
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI (built on Radix UI)
- **Deployment**: Vercel

### Directory Structure

**`src/app/`** - Next.js App Router pages and API routes
- Route groups like `(routes)/` contain public pages
- `admin/` - Admin-only pages (requires admin role)
- `api/` - Server-side API endpoints with Next.js route handlers

**`src/components/`** - React components
- `ui/` - Base Shadcn UI components (Button, Input, Dialog, etc.)
- `admin/` - Admin-specific management components
- Other components are feature-specific (challenges, events, projects, etc.)

**`src/contexts/`** - React Context providers
- `auth-context.tsx` - Firebase authentication and user profile management
- `club-settings-context.tsx` - Dynamic club configuration
- `github-org-settings-context.tsx` - GitHub organization settings
- `social-media-context.tsx` - Social media links configuration

**`src/lib/`** - Utility functions and core services
- `firebase.ts` - Firebase client initialization (auth, db, storage, functions)
- `firebase-admin.ts` - Firebase Admin SDK for server-side operations
- `firebase-collections.ts` - TypeScript interfaces for all Firestore collections
- `brevo.ts` - Brevo email service integration
- `utils.ts` - General utility functions

**`src/lib/services/`** - Business logic and data access layer
- `badges.ts` - Badge awarding system
- `challenges.ts` - Challenge CRUD operations
- `events.ts` - Event management
- `posts.ts` - Blog post operations
- `projects.ts` - Project showcase management
- `resources.ts` - Learning resources
- `settings.ts` - Club settings management
- `github.ts` - GitHub API integration (org membership, invites)

### Authentication & Authorization

**User Roles:**
- `guest` - Default for new signups (can view public content)
- `member` - Approved club members (can submit challenges, create projects)
- `officer` - Club officers (can review submissions, manage some content)
- `admin` - Full access to admin panel and all operations

**Role Checking:**
- Client-side: Use `useAuth()` hook's `hasRole(['admin', 'officer'])` method
- Server-side: Use Firebase Admin SDK in API routes to verify auth tokens and check user roles from Firestore

**Important:** Admin and officer-only pages/API routes MUST verify roles server-side. Client-side redirects are not sufficient for security.

### Firebase Architecture

**Client SDK** (`src/lib/firebase.ts`):
- Used in client components and pages
- Handles user authentication and real-time data subscriptions
- Exports: `auth`, `db`, `storage`, `functions`

**Admin SDK** (`src/lib/firebase-admin.ts`):
- Used exclusively in API routes (`src/app/api/**/route.ts`)
- Provides elevated permissions for server-side operations
- Required for server-side auth verification
- Exports: `adminDb`

**Key Collections** (see `firebase-collections.ts`):
- `users` - User profiles with roles and points
- `challenges` - Coding challenges with difficulty levels
- `submissions` - Challenge submissions with status tracking
- `events` - Club events with RSVP capability
- `projects` - Member project showcases
- `posts` - Blog articles
- `resources` - Curated learning materials
- `githubMembershipRequests` - GitHub org membership requests

### API Route Patterns

All API routes follow Next.js 15 App Router conventions with `route.ts` files.

**Typical Pattern:**
```typescript
export async function POST(req: NextRequest) {
  // 1. Parse and validate input
  const { field1, field2 } = await req.json();

  // 2. For protected routes: verify auth using Firebase Admin
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);

  // 3. Check user role from Firestore if needed
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  const role = userDoc.data()?.role;

  // 4. Perform operation
  // ...

  // 5. Return JSON response
  return NextResponse.json({ success: true });
}
```

**Important API Routes:**
- `/api/github/*` - GitHub org membership management
- `/api/admin/*` - Admin-only operations (test emails, etc.)
- `/api/contact` - Contact form submission
- `/api/send-newsletter` - Email newsletter distribution
- `/api/send-challenge-notification` - Challenge notification emails

### Service Layer Pattern

Services in `src/lib/services/` encapsulate business logic and Firestore operations. They can be used in both client components (via Firebase client SDK) and API routes (via Firebase Admin SDK).

**Example Service Structure:**
```typescript
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export const exampleService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'collectionName'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  // ... more methods
};
```

### GitHub Integration

The application integrates with GitHub's API for organization membership management. The `GitHubService` class handles:
- Verifying GitHub usernames
- Checking organization membership
- Sending organization invites (admin-only)
- Validating against SSRF attacks (allowlist + DNS/IP checks)

**Environment Variables Required:**
- `GITHUB_ORG_NAME` - GitHub organization name
- `GITHUB_TOKEN` - Personal access token with `admin:org` and `read:user` scopes

## Important Patterns & Conventions

### TypeScript
- Avoid `any` types - use proper interfaces or `unknown` with type guards
- All Firestore document types are defined in `firebase-collections.ts`
- Use type inference where possible, explicit types where clarity is needed

### Styling
- Use Tailwind CSS utility classes exclusively
- Avoid custom CSS files
- Use Shadcn UI components from `src/components/ui/` before building custom components
- Follow responsive design patterns (`sm:`, `md:`, `lg:` breakpoints)

### Components
- Use functional components with React Hooks
- Extract reusable logic into custom hooks (`src/hooks/`)
- Keep components focused and single-purpose
- Use React Context for global state (auth, settings)

### Commit Messages
Follow Conventional Commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code formatting (not CSS)
- `refactor:` - Code restructuring without behavior changes
- `chore:` - Maintenance tasks (deps, config)

## Security Considerations

**Critical Security Rules:**
1. **Never commit secrets** - No `.env` files, API keys, or tokens in code
2. **Server-side auth** - All admin/officer API routes must verify auth tokens with Firebase Admin SDK
3. **Input validation** - Validate all user inputs on both client and server
4. **Role verification** - Check user roles from Firestore, not from client claims
5. **Firebase Security Rules** - Firestore and Storage rules must enforce access control (never use `allow read, write: if true;` in production)
6. **XSS prevention** - Sanitize user-generated content, avoid `dangerouslySetInnerHTML`
7. **SSRF protection** - GitHub integration includes URL allowlisting and DNS validation

**Environment Variables:**
- `NEXT_PUBLIC_*` variables are exposed to the browser - only use for non-sensitive config
- All secrets (API keys, tokens, private keys) must be server-side only

## Testing & Validation

Before committing:
1. Run `npm run format` - Auto-format code
2. Run `npm run lint:fix` - Fix linting issues
3. Run `npm run type-check` - Verify TypeScript types
4. Test locally with `npm run dev`
5. Ensure Firebase rules are tested if data model changes

## Common Tasks

**Adding a new page:**
1. Create page in `src/app/(routes)/page-name/page.tsx`
2. Update navigation in relevant nav components
3. Add to sitemap if needed (`src/app/sitemap.ts`)

**Adding a new API endpoint:**
1. Create `src/app/api/endpoint-name/route.ts`
2. Implement HTTP method handlers (GET, POST, etc.)
3. Add server-side auth verification for protected endpoints
4. Validate all inputs
5. Use Firebase Admin SDK for Firestore operations

**Adding a new Firestore collection:**
1. Define interface in `src/lib/firebase-collections.ts`
2. Create service in `src/lib/services/collection-name.ts`
3. Add Firestore security rules
4. Update admin panel if needed

**Adding a new UI component:**
1. Check if Shadcn UI has a suitable component first
2. If creating custom, place in `src/components/`
3. Follow existing patterns for props and styling
4. Use TypeScript interfaces for props
