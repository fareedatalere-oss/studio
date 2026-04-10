'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus,
  ArrowLeft,
  Loader2,
  Music as MusicIcon,
  Play,
  Film as FilmIcon,
  MessageSquare,
  ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, Query } from '@/lib/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';

/**
 * @fileOverview Complete Media Hub Redesign based on User Sketch.
 * HEADER: Post (Top Left), Row of 5 buttons (Tabs, Text/Images, Reels, Films, music).
 * BODY: Mixed feed for "Tabs", specific layouts for each type.
 */

type MediaTab = 'tabs' | 'text_images' | 'reels' | 'films' | 'music';

export default function MediaPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MediaTab>('tabs');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
        const queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, queries);
        setPosts(res.documents);
    } catch (e) {
        console.error("Failed to load media", e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = posts.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = p.username?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.text?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (activeTab === 'tabs') return true;
      if (activeTab === 'text_images') return p.type === 'text' || p.type === 'image';
      if (activeTab === 'reels') return p.type === 'reels';
      if (activeTab === 'films') return p.type === 'film';
      if (activeTab === 'music') return p.type === 'music';
      return true;
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-body">
      <header className="p-4 pt-12 bg-background border-b z-30 shadow-sm space-y-4">
        {/* ROW 1: Post Button (Top Left) as in sketch */}
        <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="font-black uppercase text-xs tracking-widest text-primary gap-1 p-0 h-auto">
                <Link href="/dashboard/media/upload/text">
                    Post <Plus className="h-3 w-3" />
                </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full bg-muted/50 h-7 w-7">
                <ArrowLeft className="h-3 w-3" />
            </Button>
        </div>

        {/* ROW 2: Navigation Buttons (Sketch Order) */}
        <div className="flex justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
                { id: 'tabs', label: 'Tabs' },
                { id: 'text_images', label: 'Text/Images' },
                { id: 'reels', label: 'Reels' },
                { id: 'films', label: 'Films' },
                { id: 'music', label: 'music' }
            ].map((tab) => (
                <Button 
                    key={tab.id}
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                        "h-8 px-3 rounded-full font-black uppercase text-[9px] tracking-tight shrink-0 border border-transparent transition-all",
                        activeTab === tab.id ? "bg-primary text-white" : "bg-muted/50 text-foreground/70"
                    )}
                    onClick={() => setActiveTab(tab.id as MediaTab)}
                >
                    {tab.label}
                </Button>
            ))}
        </div>

        {/* ROW 3: Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
          <Input 
            placeholder="Search..." 
            className="pl-10 rounded-xl h-10 bg-muted/50 border-none shadow-none font-bold text-[10px]" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* FEED CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 space-y-8 pb-24 scroll-smooth">
        {loading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 font-black uppercase text-[10px] tracking-widest">Loading Media...</p>
            </div>
        ) : filteredPosts.length > 0 ? (
            <div className="space-y-10">
                {/* 1. REELS & IMAGES GRID (As shown at top of sketch) */}
                {(activeTab === 'tabs' || activeTab === 'reels' || activeTab === 'text_images') && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Reels & Images</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {filteredPosts.filter(p => p.type === 'reels' || p.type === 'image').slice(0, 6).map(p => (
                                <Link key={p.$id} href={`/dashboard/media/post/${p.$id}/${p.type === 'text' ? 'text' : 'view'}`} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm border bg-muted">
                                    {p.mediaUrl && (
                                        <Image src={p.mediaUrl} alt="Thumbnail" fill className="object-cover" />
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md rounded-full p-1">
                                        {p.type === 'reels' ? <FilmIcon className="h-2 w-2 text-white" /> : <ImageIcon className="h-2 w-2 text-white" />}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. FILMS SECTION (Big card as shown in sketch) */}
                {(activeTab === 'tabs' || activeTab === 'films') && (
                    <div className="space-y-3">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Films</h3>
                        {filteredPosts.filter(p => p.type === 'film').slice(0, 2).map(p => (
                            <div key={p.$id} className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl group border-4 border-white">
                                {p.mediaUrl && (
                                    <video src={p.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                                    <p className="text-white font-black uppercase text-sm tracking-tighter leading-tight">{p.description?.split('|').pop()}</p>
                                    <p className="text-white/60 text-[8px] font-bold uppercase mt-1">Uploaded by @{p.username}</p>
                                    <Button variant="secondary" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 backdrop-blur-xl border-none shadow-2xl">
                                        <Play className="h-6 w-6 text-white fill-white" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. MUSIC SECTION (Card with Artist Icon as shown in sketch) */}
                {(activeTab === 'tabs' || activeTab === 'music') && (
                    <div className="space-y-3">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Music</h3>
                        {filteredPosts.filter(p => p.type === 'music').slice(0, 3).map(p => (
                            <div key={p.$id} className="bg-muted/30 rounded-[2rem] p-4 flex items-center gap-4 border shadow-sm group active:scale-95 transition-all">
                                <div className="relative h-16 w-16 shrink-0">
                                    <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg">
                                        <AvatarImage src={p.thumbnailUrl || p.userAvatar} className="object-cover" />
                                        <AvatarFallback className="font-black bg-primary text-white">M</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute bottom-0 right-0 bg-primary p-1 rounded-full border-2 border-white">
                                        <MusicIcon className="h-2 w-2 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black uppercase text-xs truncate tracking-tighter leading-none">{p.description?.split('|').pop() || 'Untitled Track'}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">@{p.username} • {p.category || 'Artist'}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full w-1/3 bg-primary animate-pulse"></div>
                                        </div>
                                        <span className="text-[8px] font-mono opacity-50">12:07</span>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-primary/10 text-primary">
                                    <Play className="h-4 w-4 fill-primary" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. TEXT SECTION (Note block as shown in sketch) */}
                {(activeTab === 'tabs' || activeTab === 'text_images') && (
                    <div className="space-y-3">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Recent Thoughts</h3>
                        {filteredPosts.filter(p => p.type === 'text').slice(0, 3).map(p => (
                            <div key={p.$id} className={cn("rounded-[2rem] p-6 shadow-xl border flex flex-col gap-4 min-h-[120px] transition-transform active:scale-95", p.backgroundColor || 'bg-white')}>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 ring-2 ring-white/50">
                                        <AvatarImage src={p.userAvatar} />
                                        <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className={cn("font-black uppercase text-[10px] leading-none", p.backgroundColor === 'bg-white' ? 'text-black' : 'text-white')}>@{p.username}</p>
                                        <p className={cn("text-[8px] font-bold uppercase opacity-60 mt-0.5", p.backgroundColor === 'bg-white' ? 'text-black' : 'text-white')}>Shared a note</p>
                                    </div>
                                </div>
                                <p className={cn("text-sm font-bold leading-tight line-clamp-4", p.backgroundColor === 'bg-white' ? 'text-black' : 'text-white')}>
                                    {p.text}
                                </p>
                                <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className={cn("h-3 w-3", p.backgroundColor === 'bg-white' ? 'text-black/30' : 'text-white/30')} />
                                        <span className={cn("text-[10px] font-black", p.backgroundColor === 'bg-white' ? 'text-black/30' : 'text-white/30')}>{p.commentCount || 0}</span>
                                    </div>
                                    <p className={cn("text-[8px] font-black uppercase opacity-30", p.backgroundColor === 'bg-white' ? 'text-black' : 'text-white')}>Descriptions</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20 grayscale">
                <PlaySquare className="h-24 w-24 mb-6" />
                <p className="font-black uppercase text-xs tracking-[0.5em]">Nothing Shared Yet</p>
                <p className="text-[10px] font-bold mt-2">Click Post to be the first!</p>
            </div>
        )}
      </main>
    </div>
  );
}
