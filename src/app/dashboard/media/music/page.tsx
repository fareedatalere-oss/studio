
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

const categories = ["all", "Traditional song", "English vision", "Indian cemp", "Hip/rappers"];

export default function MusicLibraryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser, profile: currentUserProfile, recheckUser } = useUser();

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
        if (selectedCategory !== "all") result = result.filter(p => p.category === selectedCategory || (selectedCategory === 'Traditional song' && p.category === 'Gargajiya'));
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
                    <MusicPostCard key={post.$id} post={post} isMuted={isMuted} onMuteChange={setIsMuted} currentUser={currentUser} currentUserProfile={currentUserProfile} recheckUser={recheckUser} />
                )) : <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-10 text-center"><Music className="h-16 w-16 opacity-20 mb-4" /><p className="font-black uppercase text-sm tracking-widest">No tracks found</p></div>}
            </main>
        </div>
    );
}

function MusicPostCard({ post, isMuted, onMuteChange, currentUser, currentUserProfile, recheckUser }: any) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const postRef = useRef<HTMLDivElement>(null);
    const [isLiked, setIsLiked] = useState(() => post.likes?.includes(currentUser?.$id));
    const [likeCount, setLikeCount] = useState(() => post.likes?.length || 0);
    const [isFollowing, setIsFollowing] = useState(() => currentUserProfile?.following?.includes(post.userId) || false);
    const [isLoadingFollow, setIsLoadingFollow] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { audio.muted = isMuted; audio.play().catch(() => {}); }
            else audio.pause();
        }, { threshold: 0.6 });
        if (postRef.current) observer.observe(postRef.current);
        return () => observer.disconnect();
    }, [isMuted]);

    const handleLike = async () => {
        if (!currentUser) return;
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
        try {
            const newLikes = newIsLiked ? [...(post.likes || []), currentUser.$id] : post.likes.filter((id: string) => id !== currentUser.$id);
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id, { likes: newLikes });
        } catch (e) { setIsLiked(!newIsLiked); setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1); }
    };

    const handleFollow = async () => {
        if (!currentUser || isLoadingFollow) return;
        setIsLoadingFollow(true);
        const newState = !isFollowing;
        setIsFollowing(newState);
        try {
            const myProf = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
            const theirProf = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId);
            const newFollowing = newState ? [...(myProf.following || []), post.userId] : myProf.following.filter((id: string) => id !== post.userId);
            const newFollowers = newState ? [...(theirProf.followers || []), currentUser.$id] : theirProf.followers.filter((id: string) => id !== currentUser.$id);
            await Promise.all([
                databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { following: newFollowing }),
                databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId, { followers: newFollowers })
            ]);
            await recheckUser();
        } catch (e) { setIsFollowing(!newState); } finally { setIsLoadingFollow(false); }
    };

    return (
        <div ref={postRef} className="relative h-screen w-full flex flex-col justify-center snap-start shrink-0 overflow-hidden bg-background">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                <div className="relative h-64 w-64 mb-10 rounded-full overflow-hidden border-8 border-primary animate-spin-slow">
                    <Image src={post.thumbnailUrl || "https://picsum.photos/seed/music/400/400"} alt="Music" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Music className="h-16 w-16 text-white" /></div>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">{post.displayDescription}</h2>
                <Badge variant="secondary" className="font-black uppercase text-[10px] tracking-widest">{post.category}</Badge>
                {post.mediaUrl && <audio ref={audioRef} src={post.mediaUrl} controls className="mt-10 w-full max-w-xs" muted={isMuted}></audio>}
            </div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-start gap-6 p-2 z-20">
                <div className="flex flex-col items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar className="ring-2 ring-primary h-14 w-14 shadow-xl cursor-pointer">
                                <AvatarImage src={post.userAvatar} />
                                <AvatarFallback className="bg-primary text-white font-black">{post.username?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 font-black uppercase text-[10px]">
                            <DropdownMenuItem asChild><Link href={`/dashboard/chat/${post.userId}`}><MessageSquare className="h-4 w-4 mr-2" /> Chat</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/dashboard/profile/view/${post.userId}`}><User className="h-4 w-4 mr-2" /> View</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="font-black text-xs bg-background/50 px-2 py-1 rounded-full truncate max-w-[100px]">@{post.username}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Button variant={isFollowing ? 'secondary' : 'default'} size="icon" className="h-14 w-14 rounded-full shadow-2xl" onClick={handleFollow} disabled={isLoadingFollow}>
                        {isLoadingFollow ? <Loader2 className="animate-spin" /> : isFollowing ? <UserCheck className="h-8 w-8" /> : <UserPlus className="h-8 w-8" />}
                    </Button>
                    <span className="text-[10px] font-black uppercase">{isFollowing ? 'Unfollow' : 'Follow'}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 shadow-xl border" onClick={handleLike}><Heart className={cn("h-8 w-8", isLiked && "fill-red-500 text-red-500")} /></Button>
                    <span className="text-[10px] font-black">{likeCount}</span>
                </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 p-2 z-20">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 shadow-xl border" onClick={() => onMuteChange(!isMuted)}>{isMuted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}</Button>
            </div>
            <div className="absolute bottom-8 left-0 right-0 px-8 text-center"><p className="text-[10px] font-black text-muted-foreground uppercase">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p></div>
        </div>
    );
}
