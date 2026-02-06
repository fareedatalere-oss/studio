'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Clapperboard,
  Music,
  Film,
  Type,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share,
  MoreVertical,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = 'i-pay-db';
const COLLECTION_ID_POSTS = 'posts';


const PostCard = ({ post }: { post: any }) => {
  const { user: currentUser } = useUser();

  const handleLike = async () => {
    if (!currentUser) return;
    const currentLikes = post.likes || [];
    const isLiked = currentLikes.includes(currentUser.$id);
    const newLikes = isLiked
      ? currentLikes.filter((id: string) => id !== currentUser.$id)
      : [...currentLikes, currentUser.$id];

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id, {
            likes: newLikes
        });
    } catch (error) {
        console.error("Failed to update likes:", error);
    }
  };
  
  const isLiked = post.likes?.includes(currentUser?.$id);

  return (
    <div className="relative h-[calc(100vh-170px)] bg-black flex flex-col justify-between text-white snap-start">
      {/* Header */}
       <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={post.userAvatar || `https://picsum.photos/seed/${post.userId}/100/100`} />
                        <AvatarFallback>{post.username?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{post.username}</p>
                        <p className="text-xs text-neutral-300">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="bg-transparent text-white border-white">Follow</Button>
            </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {post.type === 'text' && (
          <div className={cn("h-full w-full flex items-center justify-center p-8 text-center", post.backgroundColor)}>
            <h2 className="text-3xl font-bold whitespace-pre-wrap">{post.text}</h2>
          </div>
        )}
        {post.type === 'image' && (
          <Image src={post.mediaUrl} alt={post.description || 'Post image'} layout="fill" objectFit="contain" />
        )}
        {(post.type === 'reels' || post.type === 'film') && (
           <video src={post.mediaUrl} controls autoPlay muted loop className="w-full h-full object-contain" />
        )}
        {post.type === 'music' && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <Music className="h-32 w-32 mb-4"/>
                <h2 className="text-2xl font-bold">{post.description || 'Untitled Track'}</h2>
                <audio controls src={post.mediaUrl} className="mt-8 w-full max-w-sm"></audio>
            </div>
        )}
      </div>
      
      {/* Actions */}
       <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-4 z-10">
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1" onClick={handleLike}>
                <Heart className={cn("h-7 w-7", isLiked && "fill-red-500 text-red-500")} />
                <span className="text-xs">{post.likes?.length || 0}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1">
                <MessageCircle className="h-7 w-7" />
                <span className="text-xs">{post.commentCount || 0}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1">
                <Share className="h-7 w-7" />
            </Button>
            {post.allowDownload && (
                <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1">
                    <Download className="h-7 w-7" />
                </Button>
            )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gradient-to-t from-black/50 to-transparent z-10">
        <p className="text-sm">{post.description}</p>
      </div>
    </div>
  );
};


const PostFeed = ({ type }: { type: string }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
        setLoading(true);
        try {
            if (DATABASE_ID.includes('YOUR_') || COLLECTION_ID_POSTS.includes('YOUR_')) {
                console.warn("Appwrite post collection not configured.");
                setPosts([]);
                return;
            }
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [
                Query.equal('type', type),
                Query.orderDesc('$createdAt'),
            ]);
            setPosts(response.documents);
        } catch (error) {
            console.error("Failed to fetch posts:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchPosts();

    // Appwrite real-time subscription
    const unsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_POSTS}.documents`, response => {
        // Refetch or update posts list
        fetchPosts();
    });

    return () => {
        unsubscribe();
    };

  }, [type]);

  if (loading) {
    return <div className="p-4"><Skeleton className="h-[calc(100vh-200px)] w-full" /></div>;
  }
  
  if (!posts || posts.length === 0) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)] text-muted-foreground">No {type} posts yet.</div>
  }

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory">
      {posts.map(post => <PostCard key={post.$id} post={post} />)}
    </div>
  )
}

export default function MediaPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-full">
      <Tabs defaultValue="text" className="h-full flex flex-col">
        <header className="sticky top-16 md:top-0 bg-background border-b z-20">
          <div className="container">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              <TabsTrigger value="film">Film</TabsTrigger>
              <TabsTrigger value="music">Music</TabsTrigger>
            </TabsList>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="text" className="m-0"><PostFeed type="text" /></TabsContent>
          <TabsContent value="image" className="m-0"><PostFeed type="image" /></TabsContent>
          <TabsContent value="reels" className="m-0"><PostFeed type="reels" /></TabsContent>
          <TabsContent value="film" className="m-0"><PostFeed type="film" /></TabsContent>
          <TabsContent value="music" className="m-0"><PostFeed type="music" /></TabsContent>
        </div>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="absolute bottom-24 right-6 md:bottom-6 h-16 w-16 rounded-full bg-accent hover:bg-accent/90 z-20"
          >
            <Plus className="h-8 w-8" />
            <span className="sr-only">Add Media</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader>
            <SheetTitle>Create a new post</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Link href="/dashboard/media/upload/text" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Type />
              <span>Text</span>
            </Link>
            <Link href="/dashboard/media/upload/image" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <ImageIcon />
              <span>Image</span>
            </Link>
            <Link href="/dashboard/media/upload/reels" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Clapperboard />
              <span>Reels</span>
            </Link>
            <Link href="/dashboard/media/upload/film" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Film />
              <span>Film</span>
            </Link>
             <Link href="/dashboard/media/upload/music" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Music />
              <span>Music</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
