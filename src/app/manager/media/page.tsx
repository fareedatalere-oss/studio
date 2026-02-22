'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MoreVertical, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

const PostCard = ({ post, onBan }: { post: any, onBan: (postId: string) => void }) => {

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.userAvatar} />
              <AvatarFallback>{post.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{post.username}</p>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
               <Button variant="destructive" size="sm">
                <ShieldAlert className="mr-2 h-4 w-4" /> Ban
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove the post from public view. This action can be undone later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onBan(post.$id)} className="bg-destructive hover:bg-destructive/90">
                        Confirm Ban
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {post.description && <p className="text-sm text-muted-foreground">{post.description}</p>}
        
        {post.type === 'image' && post.mediaUrl && (
          <div className="relative aspect-video w-full">
            <Image src={post.mediaUrl} alt={post.description || 'Post image'} fill className="object-cover rounded-md" />
          </div>
        )}
        {post.type === 'text' && (
          <div className={cn("rounded-lg p-4", post.backgroundColor || 'bg-gray-500')}>
            <p className="text-white whitespace-pre-wrap">{post.text}</p>
          </div>
        )}
        {(post.type === 'reels' || post.type === 'film' || post.type === 'music') && post.mediaUrl && (
           <video src={post.mediaUrl} controls className="w-full rounded-md" />
        )}
      </CardContent>
    </Card>
  );
};


const PostFeed = ({ type }: { type: string }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPosts = async () => {
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [
                Query.equal('type', type),
                Query.orderDesc('$createdAt'),
                Query.limit(50) // Limit to 50 for performance
            ]);
            setPosts(response.documents);
        } catch (error) {
            console.error(`Failed to fetch ${type} posts:`, error);
        } finally {
            setLoading(false);
        }
    };
    fetchPosts();

    // No real-time subscription for now to avoid overwhelming the manager dashboard
  }, [type]);

  const handleBanPost = (postId: string) => {
    // This is a mock action. In a real app, you'd update the post's status.
    toast({
        title: 'Post Banned',
        description: `Post ID ${postId} has been hidden from public view.`
    });
    setPosts(prevPosts => prevPosts.filter(p => p.$id !== postId));
  }

  if (loading) {
    return <div className="space-y-4 p-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }
  
  if (!posts || posts.length === 0) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">No {type} posts found.</div>
  }

  return (
    <div className="space-y-4">
      {posts.map(post => <PostCard key={post.$id} post={post} onBan={handleBanPost} />)}
    </div>
  )
}


export default function ManagerMediaPage() {
   const postTypes = ["text", "image", "reels", "film", "music"];

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Media Management</h1>
        <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                {postTypes.map(type => (
                    <TabsTrigger key={type} value={type} className="capitalize">{type}</TabsTrigger>
                ))}
            </TabsList>
            {postTypes.map(type => (
                <TabsContent key={type} value={type} className="mt-4">
                    <PostFeed type={type} />
                </TabsContent>
            ))}
      </Tabs>
    </div>
  );
}
