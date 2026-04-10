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
 * Header strictly contains: Tabs, Text/Image, Reels, Films, Music, Search, and Post.
 * Refined with better spacing and smaller post button for mobile.
 */

export default function MediaPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="p-4 pt-12 bg-background border-b z-30 shadow-sm space-y-5">
        {/* Row 1: Back Button & Five Navigation Buttons with increased gap */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full bg-muted/50 h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex justify-center gap-4 overflow-x-auto no-scrollbar">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" title="Tabs">
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Text/Image">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Reels">
              <Clapperboard className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Films">
              <Film className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" title="Music">
              <Music className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Row 2: Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search media..." 
            className="pl-10 rounded-full h-10 bg-muted/50 border-none shadow-none font-bold text-xs" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Row 3: Reduced Post Button */}
        <div className="flex justify-center">
            <Button asChild className="w-full max-w-sm h-9 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-md gap-2">
            <Link href="/dashboard/media/upload/text">
                <Plus className="h-3 w-3" /> Create New Post
            </Link>
            </Button>
        </div>
      </header>

      {/* Media content area: Empty as requested. No database calls. */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-10 text-center">
        <div className="opacity-10 grayscale">
            <Clapperboard className="h-20 w-20 mx-auto mb-4" />
            <p className="font-black uppercase text-[10px] tracking-[0.5em]">Media Hub Empty</p>
        </div>
      </main>
    </div>
  );
}
