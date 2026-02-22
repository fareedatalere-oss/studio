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
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_POSTS, COLLECTION_ID_POST_COMMENTS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';


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
            // 1. Delete associated media from storage, if it exists
            if (post.mediaUrl) {
                const fileId = getFileIdFromUrl(post.mediaUrl);
                if (fileId) {
                    await storage.deleteFile(BUCKET_ID_UPLOADS, fileId);
                }
            }

            // 2. Delete all comments associated with the post
            const comments = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, [
                Query.equal('postId', post.$id),
            ]);
            await Promise.all(comments.documents.map(comment =>
                databases.deleteDocument(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, comment.$id)
            ));

            // 3. Delete the post document itself
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id);

            // 4. Trigger parent component's onDelete to update UI
            onDelete(post.$id);
            toast({ title: 'Post deleted successfully!'});

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not delete post: ${error.message}`});
        }
    };
    
    const handleDownload = (url: string, filename: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.target = "_blank";
        link.download = filename || 'ipay-media-download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Download started" });
    };

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div className='flex-1'>
                    {post.description && <CardTitle className="text-base">{post.description}</CardTitle>}
                    <CardDescription>{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</CardDescription>
                </div>
                 <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           {post.allowDownload && post.mediaUrl && (
                                <DropdownMenuItem onClick={() => handleDownload(post.mediaUrl, post.description)}>
                                    <Download className="mr-2 h-4 w-4" /> Download
                                </DropdownMenuItem>
                           )}
                           <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                           </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your post and all its comments.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardHeader>
            <CardContent>
                {post.type === 'image' && <Image src={post.mediaUrl} alt={post.description || ''} width={400} height={400} className="rounded-md w-full object-cover" />}
                {post.type === 'text' && <div className={`p-4 rounded-md ${post.backgroundColor} text-white`}>{post.text}</div>}
                {(post.type === 'reels' || post.type === 'film' || post.type === 'music') && post.mediaUrl && <video src={post.mediaUrl} controls className="w-full rounded-md" />}
                
                <div className="flex gap-4 text-sm text-muted-foreground mt-4">
                    <span className="flex items-center gap-1"><Heart className="h-4 w-4"/> {post.likes?.length || 0} Likes</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4"/> {post.commentCount || 0} Comments</span>
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
        }).catch(err => {
            console.error("Failed to fetch user posts:", err);
        }).finally(() => {
            setLoading(false);
        });
    }, [type, userId]);
    
    const handlePostDeleted = (postId: string) => {
        setPosts(prev => prev.filter(p => p.$id !== postId));
    };

    if (loading) return <div className='space-y-4'><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
    if (posts.length === 0) return <p className='text-center text-muted-foreground p-8'>You have no {type} posts yet.</p>

    return (
        <div className="space-y-4">
            {posts.map(post => <PostCard key={post.$id} post={post} onDelete={handlePostDeleted} />)}
        </div>
    )
};


export default function MyPostsPage() {
    const { user, loading: userLoading } = useUser();
    const postTypes = ["text", "image", "reels", "film", "music"];

    if (userLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    if (!user) {
        return <div className="text-center p-8">Please sign in to see your posts.</div>
    }

  return (
    <div className="container py-8">
      <Link href="/dashboard/profile" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
      
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
            {postTypes.map(type => (
                <TabsTrigger key={type} value={type} className="capitalize">{type}</TabsTrigger>
            ))}
        </TabsList>
        {postTypes.map(type => (
            <TabsContent key={type} value={type} className="mt-4">
                <PostList type={type} userId={user.$id} />
            </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
