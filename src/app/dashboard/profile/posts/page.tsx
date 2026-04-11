'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  Download,
  Heart,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_POSTS, COLLECTION_ID_POST_COMMENTS, Query } from '@/lib/appwrite';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const PostCard = ({ post, onDelete }: { post: any, onDelete: (postId: string) => void }) => {
    const { toast } = useToast();

    const getFileIdFromUrl = (url: string) => {
        try {
            const urlParts = url.split('/files/');
            if (urlParts.length < 2) return null;
            return urlParts[1].split('/view')[0];
        } catch (e) {
            console.error("Could not parse file ID from URL", e);
            return null;
        }
    };
    
    const handleDelete = async () => {
        toast({ title: 'Deleting post...'});
        try {
            if (post.mediaUrl) {
                const fileId = getFileIdFromUrl(post.mediaUrl);
                if (fileId) {
                    await storage.deleteFile(BUCKET_ID_UPLOADS, fileId);
                }
            }

            const comments = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, [
                Query.equal('postId', post.$id),
            ]);
            await Promise.all(comments.documents.map(comment =>
                databases.deleteDocument(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, comment.$id)
            ));

            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id);
            onDelete(post.$id);
            toast({ title: 'Post deleted successfully!'});

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not delete post: ${error.message}`});
        }
    };
    
    const handleDownload = async (url: string, filename: string, postType: string) => {
        if (!url) return;
        window.open(url);
    };

    return (
        <Card className="rounded-2xl shadow-sm border-muted/50 overflow-hidden">
            <CardHeader className="flex-row justify-between items-center bg-muted/10">
                <div className='flex items-center gap-3'>
                    <Avatar className="h-10 w-10 border-2 border-white">
                        <AvatarImage src={post.userAvatar} />
                        <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-sm font-bold">@{post.username}</CardTitle>
                        <CardDescription className="text-[9px] font-black uppercase opacity-50">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</CardDescription>
                    </div>
                </div>
                 <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-black uppercase text-[10px]">
                           {post.allowDownload && post.mediaUrl && (
                                <DropdownMenuItem onClick={() => handleDownload(post.mediaUrl, post.description, post.type)}>
                                    <Download className="mr-2 h-3.5 w-3.5" /> Download
                                </DropdownMenuItem>
                           )}
                           <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Post
                                </DropdownMenuItem>
                           </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent className="rounded-[2.5rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-black uppercase text-center">Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-center font-bold text-xs">
                                This will permanently delete your post and all its comments from the cloud history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row gap-2">
                            <AlertDialogCancel className="flex-1 rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardHeader>
            <CardContent className="pt-4">
                {post.type === 'image' && post.mediaUrl && <Image src={post.mediaUrl} alt="post" width={400} height={400} className="rounded-xl w-full object-cover shadow-sm" unoptimized />}
                {post.type === 'text' && <div className={cn("p-6 rounded-2xl text-center shadow-inner", post.backgroundColor || 'bg-primary')}><p className="font-bold text-white whitespace-pre-wrap">{post.text}</p></div>}
                {(post.type === 'reels' || post.type === 'film') && post.mediaUrl && <video src={post.mediaUrl} controls className="w-full rounded-xl shadow-sm bg-black" />}
                
                <div className="flex gap-6 mt-4 px-2">
                    <span className="flex items-center gap-1 font-black uppercase text-[10px] opacity-60"><Heart className="h-4 w-4 text-red-500 fill-red-500"/> {post.likes?.length || 0}</span>
                    <span className="flex items-center gap-1 font-black uppercase text-[10px] opacity-60"><MessageCircle className="h-4 w-4 text-primary"/> {post.commentCount || 0}</span>
                </div>
            </CardContent>
        </Card>
    )
}

const PostList = ({ type, userId }: { type: string, userId: string }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [
            Query.equal('userId', userId),
            Query.equal('type', type),
            Query.orderDesc('$createdAt')
        ]).then(response => {
            setPosts(response.documents);
        }).catch(() => {}).finally(() => setLoading(false));
    }, [type, userId]);
    
    const handlePostDeleted = (postId: string) => {
        setPosts(prev => prev.filter(p => p.$id !== postId));
    };

    if (loading) return <div className='space-y-4'><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-32 w-full rounded-2xl" /></div>
    if (posts.length === 0) return <div className="py-20 text-center text-muted-foreground opacity-20"><Trash2 className="mx-auto h-12 w-12 mb-4"/><p className="font-black uppercase text-[10px] tracking-widest">No {type} shared yet</p></div>

    return (
        <div className="space-y-4">
            {posts.map(post => <PostCard key={post.$id} post={post} onDelete={handlePostDeleted} />)}
        </div>
    )
};

export default function MyPostsPage() {
    const { user, loading: userLoading } = useUser();
    const postTypes = ["text", "image", "reels", "film", "music"];

    if (userLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

    if (!user) return <div className="text-center p-20 font-black uppercase text-xs opacity-30">Login to see your posts</div>

  return (
    <div className="container py-8 max-w-2xl">
      <Link href="/dashboard/profile" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Profile
      </Link>
      
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted h-12 rounded-2xl p-1 mb-6">
            {postTypes.map(type => (
                <TabsTrigger key={type} value={type} className="rounded-xl font-black uppercase text-[9px] tracking-tighter">{type === 'reels' ? 'Reel' : type}</TabsTrigger>
            ))}
        </TabsList>
        {postTypes.map(type => (
            <TabsContent key={type} value={type} className="m-0">
                <PostList type={type} userId={user.$id} />
            </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
