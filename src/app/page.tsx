'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Landing Page for I-pay online world.
 * Branding: Welcome To I-pay (Strict Title Case).
 * IDENTITY PERSISTENCE: Redirects authenticated users instantly.
 */

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  // If user is logged in, don't show the landing page (prevents flash during redirect)
  if (user) return null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-8 text-center">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          data-ai-hint={heroImage.imageHint}
          fill
          className="object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-4xl font-headline font-bold tracking-tighter md:text-6xl lg:text-7xl">
          Welcome To I-pay
        </h1>
        <p className="mt-4 max-w-xl text-lg text-foreground/80 md:text-xl font-medium">
          The new world of online business and transactions.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="default" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 h-11 shadow-xl">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
          <Button asChild size="default" variant="secondary" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 h-11 shadow-lg">
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
