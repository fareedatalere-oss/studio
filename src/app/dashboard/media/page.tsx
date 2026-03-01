
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Type, Image as ImageIcon, Clapperboard, Film, Music, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useRouter } from 'next/navigation';
import { PostCard } from '@/components/media-post-card';

const PostFeed = ({ posts, isMuted, onMuteChange }: { posts: any[]; isMuted: boolean; onMuteChange: (muted: boolean) => void; }) => {
  if (!posts || posts.length === 0) return <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-6"><div className="p-8 bg-muted rounded-full"><Clapperboard className="h-16 w-16 opacity-30" /></div><p className="font-black uppercase text-sm tracking-[0.3em]">No posts found</p></div>;
  return <div className="h-full w-full flex flex-col overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide">{posts.map(post => <PostCard key={post.$id} post={post} isMuted={isMuted} onMuteChange={onMuteChange} />)}</div>;
}

export default function MediaPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isFeedMuted, setIsFeedMuted] = useState(true);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      <Tabs defaultValue="reels" onValueChange={(val) => val === 'music' && router.push('/dashboard/media/music')} className="h-full flex flex-col">
        <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-background/60 via-background/30 to-transparent pt-12 pb-8">
          <div className="container px-0">
            <TabsList className="grid w-full grid-cols-5 bg-transparent h-12">
              <TabsTrigger value="text" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider">Text</TabsTrigger>
              <TabsTrigger value="image" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider">Image</TabsTrigger>
              <TabsTrigger value="reels" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider">Reels</TabsTrigger>
              <TabsTrigger value="film" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider">Film</TabsTrigger>
              <TabsTrigger value="music" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider">Music</TabsTrigger>
            </TabsList>
             <div className="relative p-2 px-6 flex items-center gap-2 mt-2"><div className='relative flex-1'><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" /><Input placeholder="Search posts..." className="pl-10 h-10 bg-background/30 border-border/10 text-xs rounded-full backdrop-blur-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
          </div>
        </header>
        <div className="flex-1 h-full overflow-hidden">
          {loading ? <div className="h-full w-full flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div> : (
            <div className="h-full w-full">
              <TabsContent value="text" className="m-0 h-full"><PostFeed posts={getPostsForType('text')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} /></TabsContent>
              <TabsContent value="image" className="m-0 h-full"><PostFeed posts={getPostsForType('image')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} /></TabsContent>
              <TabsContent value="reels" className="m-0 h-full"><PostFeed posts={getPostsForType('reels')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} /></TabsContent>
              <TabsContent value="film" className="m-0 h-full"><PostFeed posts={getPostsForType('film')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} /></TabsContent>
              <TabsContent value="music" className="m-0 h-full"><PostFeed posts={getPostsForType('music')} isMuted={isFeedMuted} onMuteChange={setIsFeedMuted} /></TabsContent>
            </div>
          )}
        </div>
      </Tabs>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><Button size="icon" className="fixed bottom-10 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full z-50 shadow-2xl bg-primary border-4 border-white/20 animate-bounce-slow"><Plus className="h-8 w-8" /></Button></SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[3rem] pb-12 shadow-2xl border-t-4 border-primary">
          <SheetHeader><SheetTitle className="text-center font-black uppercase text-xs tracking-[0.4em] pt-6">Create Post</SheetTitle></SheetHeader>
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
