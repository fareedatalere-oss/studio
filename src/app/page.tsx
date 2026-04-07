
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

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
          Welcome to I-pay online world
        </h1>
        <p className="mt-4 max-w-xl text-lg text-foreground/80 md:text-xl">
          Online business and transactions
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
