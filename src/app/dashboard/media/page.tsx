'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Type, Image as ImageIcon, Clapperboard, Film, Music, Loader2, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, Query } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';
import { PostCard } from '@/components/media-post-card';
import { cn } from '@/lib/utils';

const PostFeed = ({ posts, isMuted, onMuteChange, uiVisible, onToggleUi }: { posts: any[]; isMuted: boolean; onMuteChange: (muted: boolean) => void; uiVisible: boolean; onToggleUi: () => void; }) => {
  if (!posts || posts.length === 0) return <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-6"><div className="p-8 bg-muted rounded-full"><Clapperboard className="h-16 w-16 opacity-30" /></div><p className="font-black uppercase text-sm tracking-[0.3em]">No posts found</p></div>;
  return <div className="h-full w-full flex flex-col overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide">{posts.map(post => <PostCard key={post.$id} post={post} isMuted={isMuted} onMuteChange={onMuteChange} forceUiVisible={uiVisible} onToggleUi={onToggleUi} />)}</div>;
}

export default function MediaPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isFeedMuted, setIsFeedMuted] = useState(true);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uiVisible, setUiVisible] = useState(true);

  useEffect(() => {
        setLoading(true);
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [Query.orderDesc('$createdAt'), Query.limit(100)])
            .then(res => {
                const parsed = res.documents.map(post => {
                    if (post.type === 'music' || post.type === 'film') {
                        const desc = post.description || '';
                        const catMatch = desc.match(/CAT:([^|]+)\|/);
                        const thumbMatch = desc.match(/ICON:([^|]+)\|/);
                        return {
                            ...post,
                            category: catMatch ? catMatch[1] : 'General',
                            thumbnailUrl: thumbMatch ? thumbMatch[1] : ''
                        };
                    }
                    return post;
                });
                setAllPosts(parsed);
            })
            .catch(err => console.error("Failed to fetch posts:", err))
            .finally(() => setLoading(false));
    }, []);

    const filteredPosts = useMemo(() => {
        if (!searchQuery) return allPosts;
        const q = searchQuery.toLowerCase();
        return allPosts.filter(p => p.description?.toLowerCase().includes(q) || p.text?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q));
    }, [allPosts, searchQuery]);

    const getPostsForType = (type: string) => filteredPosts.filter(p => p.type === type);

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      <Tabs defaultValue="reels" onValueChange={(val) => {
          if (val === 'music') router.push('/dashboard/media/music');
          if (val === 'film') router.push('/dashboard/media/film');
      }} className="h-full flex flex-col">
        <header className={cn(
            "absolute top-0 left-0 right-0 z-30 bg-background/60 backdrop-blur-md pt-12 pb-2 transition-all duration-300 border-b border-white/10",
            !uiVisible && "-translate-y-full opacity-0 pointer-events-none"
        )}>
          <div className="container px-0 flex flex-col items-center">
            <div className="w-full flex items-center px-4 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full bg-white/10 h-8 w-8">
                    <ArrowLeft className="h-4 w-4 text-white" />
                </Button>
                <div className="flex-1 flex justify-center">
                    <TabsList className="bg-transparent h-10 p-0 gap-1">
                        <TabsTrigger value="text" className="h-8 rounded-full font-black uppercase text-[9px] px-3 data-[state=active]:bg-primary data-[state=active]:text-white">Text</TabsTrigger>
                        <TabsTrigger value="image" className="h-8 rounded-full font-black uppercase text-[9px] px-3 data-[state=active]:bg-primary data-[state=active]:text-white">Image</TabsTrigger>
                        <TabsTrigger value="reels" className="h-8 rounded-full font-black uppercase text-[9px] px-3 data-[state=active]:bg-primary data-[state=active]:text-white">Reels</TabsTrigger>
                        <TabsTrigger value="film" className="h-8 rounded-full font-black uppercase text-[9px] px-3 data-[state=active]:bg-primary data-[state=active]:text-white">Films</TabsTrigger>
                        <TabsTrigger value="music" className="h-8 rounded-full font-black uppercase text-[9px] px-3 data-[state=active]:bg-primary data-[state=active]:text-white">Music</TabsTrigger>
                    </TabsList>
                </div>
            </div>
             <div className="relative w-full max-w-sm px-4 pb-2">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
                <Input 
                    placeholder="Search posts..." 
                    className="pl-9 h-9 bg-white/10 border-none text-[10px] font-bold rounded-full text-white placeholder:text-white/30" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                />
            </div>
          </div>
        </header>
        <div className="flex-1 h-full overflow-hidden">
          {loading ? <div className="h-full w-full flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div> : (
            <div className="h-full w-full">
              <TabsContent value="text" className="m-0 h-full"><PostFeed posts={getPostsForType('text')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} uiVisible={uiVisible} onToggleUi={() => setUiVisible(!uiVisible)} /></TabsContent>
              <TabsContent value="image" className="m-0 h-full"><PostFeed posts={getPostsForType('image')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} uiVisible={uiVisible} onToggleUi={() => setUiVisible(!uiVisible)} /></TabsContent>
              <TabsContent value="reels" className="m-0 h-full"><PostFeed posts={getPostsForType('reels')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} uiVisible={uiVisible} onToggleUi={() => setUiVisible(!uiVisible)} /></TabsContent>
              <TabsContent value="film" className="m-0 h-full"><PostFeed posts={getPostsForType('film')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} uiVisible={uiVisible} onToggleUi={() => setUiVisible(!uiVisible)} /></TabsContent>
              <TabsContent value="music" className="m-0 h-full"><PostFeed posts={getPostsForType('music')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} uiVisible={uiVisible} onToggleUi={() => setUiVisible(!uiVisible)} /></TabsContent>
            </div>
          )}
        </div>
      </Tabs>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><Button size="icon" className={cn("fixed bottom-10 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full z-50 shadow-2xl bg-primary border-4 border-white animate-bounce-slow transition-all", !uiVisible && "opacity-0 scale-0 pointer-events-none")}><Plus className="h-8 w-8" /></Button></SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[3rem] pb-12 shadow-2xl border-t-4 border-primary">
          <SheetHeader><SheetTitle className="text-center font-black uppercase text-[10px] tracking-[0.4em] pt-6">Create Post</SheetTitle></SheetHeader>
          <div className="grid grid-cols-3 gap-6 py-10 px-4">
            <Link href="/dashboard/media/upload/text" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all group"><Type className="h-8 w-8 group-hover:scale-110" /><span className="text-[10px] font-black uppercase">Text</span></Link>
            <Link href="/dashboard/media/upload/image" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all group"><ImageIcon className="h-8 w-8 group-hover:scale-110" /><span className="text-[10px] font-black uppercase">Image</span></Link>
            <Link href="/dashboard/media/upload/reels" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all group"><Clapperboard className="h-8 w-8 group-hover:scale-110" /><span className="text-[10px] font-black uppercase">Reels</span></Link>
            <Link href="/dashboard/media/upload/film" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all group"><Film className="h-8 w-8 group-hover:scale-110" /><span className="text-[10px] font-black uppercase">Film</span></Link>
            <Link href="/dashboard/media/upload/music" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all group"><Music className="h-8 w-8 group-hover:scale-110" /><span className="text-[10px] font-black uppercase">Music</span></Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
