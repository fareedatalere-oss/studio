
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Music, Heart, Volume2, VolumeX, Loader2, Search, UserPlus, UserCheck, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { PostCard } from '@/components/media-post-card';

const categories = ["all", "Traditional song", "English version", "Indian cemp", "Hip/rappers"];

export default function MusicLibraryPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [selectedCategory, setSelectedCategory] = useState("all");
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchMusic = async () => {
            setLoading(true);
            try {
                const queries = [Query.equal('type', 'music'), Query.orderDesc('$createdAt'), Query.limit(100)];
                const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, queries);
                const parsedPosts = res.documents.map(post => {
                    const desc = post.description || '';
                    const catMatch = desc.match(/CAT:([^|]+)\|/);
                    const iconMatch = desc.match(/ICON:([^|]+)\|/);
                    return {
                        ...post,
                        category: catMatch ? catMatch[1] : 'General',
                        thumbnailUrl: iconMatch ? iconMatch[1] : '',
                        displayDescription: desc.split('|').pop() || desc
                    };
                });
                setPosts(parsedPosts);
            } catch (error) { toast({ variant: 'destructive', title: 'Error', description: 'Failed to load music.' }); } finally { setLoading(false); }
        };
        fetchMusic();
    }, [toast]);

    const filteredPosts = useMemo(() => {
        let result = posts;
        if (selectedCategory !== "all") {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.displayDescription?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q));
        }
        return result;
    }, [posts, selectedCategory, searchQuery]);

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            <header className="p-4 pt-12 bg-background border-b z-30 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <Button onClick={() => router.push('/dashboard/media')} variant="ghost" size="icon" className="rounded-full bg-muted/50 border"><ArrowLeft className="h-5 w-5" /></Button>
                    <div className="flex-1"><h1 className="font-black uppercase text-sm tracking-widest text-primary">Music Hub</h1></div>
                </div>
                <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search music..." className="pl-10 rounded-full h-10 bg-muted/50 border-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-2">
                        {categories.map((cat) => (
                            <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)} className={cn("rounded-full font-black uppercase text-[10px] tracking-tighter h-8", selectedCategory === cat ? "bg-primary" : "bg-muted/30 border-none")}>{cat}</Button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
            </header>
            <main className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                {loading ? <div className="h-full flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="font-black uppercase text-xs text-muted-foreground animate-pulse">Syncing Tracks...</p></div> : filteredPosts.length > 0 ? filteredPosts.map(post => (
                    <PostCard key={post.$id} post={post} isMuted={isMuted} onMuteChange={setIsMuted} />
                )) : <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-10 text-center"><Music className="h-16 w-16 opacity-20 mb-4" /><p className="font-black uppercase text-sm tracking-widest">No tracks found</p></div>}
            </main>
        </div>
    );
}
