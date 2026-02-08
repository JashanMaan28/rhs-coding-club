'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/container';
import { ServerCrash, Home, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <Container className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-6 max-w-lg mx-auto px-4" role="alert">
            {/* Error digest for debugging (visually hidden) */}
            {error?.digest ? (
              <span className="sr-only">Error digest: {error.digest}</span>
            ) : null}
            {/* Server error icon */}
            <div className="flex justify-center">
              <div className="relative">
                <ServerCrash className="w-20 h-20 text-destructive" />
                <div className="absolute inset-0 w-20 h-20 text-destructive/20 blur-sm">
                  <ServerCrash className="w-20 h-20" />
                </div>
              </div>
            </div>

            {/* Error message */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold">
                Server Error
              </h1>
              <p className="text-gray-600 text-base sm:text-lg">
                A critical error occurred on our servers. We&apos;re working to resolve this issue as quickly as possible.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button onClick={reset} size="lg" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button variant="outline" asChild size="lg" className="w-full sm:w-auto">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </body>
    </html>
  );
}
