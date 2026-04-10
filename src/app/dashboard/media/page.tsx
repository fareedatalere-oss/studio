'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  LayoutGrid, 
  ImageIcon, 
  Clapperboard, 
  Film, 
  Music, 
  Search, 
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * @fileOverview Streamlined Media Hub.
 * Optimized for high-end mobile experiences.
 * Header strictly contains: Tabs, Text/Image, Reels, Films, Music, Search, and a small Post icon.
 * Empty feed as requested.
 */

export default function MediaPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="p-4 pt-12 bg-background border-b z-30 shadow-sm space-y-6">
        {/* Row 1: Back Button & Five Navigation Buttons with generous gap */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full bg-muted/50 h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex justify-center gap-8 overflow-x-auto no-scrollbar">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary shrink-0" title="Tabs">
              <LayoutGrid className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 shrink-0" title="Text/Image">
              <ImageIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 shrink-0" title="Reels">
              <Clapperboard className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 shrink-0" title="Films">
              <Film className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 shrink-0" title="Music">
              <Music className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Row 2: Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search media..." 
            className="pl-11 rounded-full h-11 bg-muted/50 border-none shadow-none font-bold text-xs" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Row 3: Small Icon Post Button */}
        <div className="flex justify-center">
            <Button asChild size="icon" className="h-10 w-10 rounded-full font-black shadow-lg bg-primary hover:bg-primary/90">
            <Link href="/dashboard/media/upload/text" title="Create New Post">
                <Plus className="h-6 w-6 text-white" />
            </Link>
            </Button>
        </div>
      </header>

      {/* Media content area: Empty. No database calls. */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-10 text-center">
        <div className="opacity-10 grayscale">
            <Clapperboard className="h-20 w-20 mx-auto mb-4" />
            <p className="font-black uppercase text-[10px] tracking-[0.5em]">Media Hub Empty</p>
        </div>
      </main>
    </div>
  );
}
