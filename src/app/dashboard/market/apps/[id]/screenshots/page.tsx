'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const mockScreenshots = [
  'https://picsum.photos/seed/screen1/600/1200',
  'https://picsum.photos/seed/screen2/600/1200',
  'https://picsum.photos/seed/screen3/600/1200',
  'https://picsum.photos/seed/screen4/600/1200',
];

export default function ScreenshotsPage({ params }: { params: { id: string } }) {
  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      <header className="p-4 flex items-center justify-between bg-black/50 z-10">
        <Link href={`/dashboard/market/apps/${params.id}`} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          Back to App
        </Link>
        <h1 className="font-semibold">Screenshots</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <Carousel className="w-full max-w-sm">
          <CarouselContent>
            {mockScreenshots.map((src, index) => (
              <CarouselItem key={index}>
                <div className="relative aspect-[9/16] w-full">
                  <Image src={src} alt={`Screenshot ${index + 1}`} fill className="object-contain rounded-lg" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
}
