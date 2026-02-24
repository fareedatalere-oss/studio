'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { databases, storage, DATABASE_ID, COLLECTION_ID_POSTS, COLLECTION_ID_POST_COMMENTS, BUCKET_ID_UPLOADS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const PostManagerCard = ({ post, onDelete }: { post: any, onDelete: (postId: string) => void }) => {
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

    return (
        <Card>
            <CardContent className="p-4 flex justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                     {post.mediaUrl && post.type !== 'text' ? (
                        <Image src={post.mediaUrl} alt="media" width={64} height={64} className="rounded-md object-cover aspect-square" />
                     ) : (
                        <div className={`w-16 h-16 rounded-md flex items-center justify-center ${post.backgroundColor || 'bg-muted'}`}>
                            <p className="text-xs text-center p-1 truncate text-white">{post.text}</p>
                        </div>
                     )}
                    <div>
                        <p className="text-sm font-semibold line-clamp-2">{post.description || post.text || 'No Description'}</p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={post.userAvatar} />
                                <AvatarFallback>{post.username?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                             <span>@{post.username}</span>
                             <span>&bull;</span>
                            <span>{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</span>
                        </div>
                    </div>
                </div>
                <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                                </DropdownMenuItem>
                           </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this post, its comments, and associated media files. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
};


export default function ManagerMediaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-media-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/media/bypass');
      return;
    }
    
    setLoading(true);
    databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [Query.orderDesc('$createdAt'), Query.limit(100)])
        .then(response => setPosts(response.documents))
        .catch(err => console.error("Failed to fetch posts", err))
        .finally(() => setLoading(false));

  }, [router]);

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.$id !== postId));
  };


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Media Management</CardTitle>
          <CardDescription>Oversee and delete all media posts on the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {posts.length > 0 ? posts.map(post => (
                <PostManagerCard key={post.$id} post={post} onDelete={handlePostDeleted} />
            )) : (
                <p className="text-center text-muted-foreground py-10">No posts found.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
