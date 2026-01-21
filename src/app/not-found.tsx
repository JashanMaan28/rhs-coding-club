'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/container';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <Container className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="text-center space-y-6 max-w-lg mx-auto px-4">
        {/* 404 Number with gradient */}
        <div className="relative">
          <h1 className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            404
          </h1>
          <div className="absolute inset-0 text-8xl sm:text-9xl font-bold text-primary/10 blur-sm">
            404
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>

          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Helpful links */}
        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            Or try one of these popular pages:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/challenges">Challenges</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">Projects</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events">Events</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/blog">Blog</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/join">Join Club</Link>
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
