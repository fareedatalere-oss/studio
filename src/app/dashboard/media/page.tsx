
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Send,
  Loader2,
  Mail,
  Link as LinkIcon,
  RotateCw,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, COLLECTION_ID_PROFILES, COLLECTION_ID_POST_COMMENTS } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';


const CommentItem = ({ comment }: { comment: any }) => (
  <div className="flex items-start gap-3">
    <Avatar className="h-8 w-8">
      <AvatarImage src={comment.userAvatar} />
      <AvatarFallback>{comment.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-sm">{comment.username}</p>
        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.$createdAt), { addSuffix: true })}</p>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.text}</p>
    </div>
  </div>
);

const CommentInput = ({ postId, onCommentPosted }: { postId: string, onCommentPosted: () => void }) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useUser();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !profile) return;

    setIsSubmitting(true);
    try {
      const newComment = {
        postId: postId,
        userId: user.$id,
        username: profile.username,
        userAvatar: profile.avatar,
        text: text.trim(),
      };
      
      await databases.createDocument(
          DATABASE_ID, 
          COLLECTION_ID_POST_COMMENTS, 
          ID.unique(), 
          newComment
      );

      const post = await databases.getDocument(DATABASE_ID, COLLECTION_ID_POSTS, postId);
      const newCount = (post.commentCount || 0) + 1;
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_POSTS, postId, {
          commentCount: newCount
      });

      setText('');
      onCommentPosted();
    } catch(e: any) {
      toast({ title: 'Error', description: `Could not post comment: ${e.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src={profile?.avatar} />
        <AvatarFallback>{profile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <Input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." disabled={isSubmitting} />
      <Button type="submit" size="icon" disabled={isSubmitting || !text.trim()}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  )
}


const PostCard = ({ post }: { post: any }) => {
  const { user: currentUser, profile: currentUserProfile, recheckUser } = useUser();
  const { toast } = useToast();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [isRotated, setIsRotated] = useState(false);

  useEffect(() => {
    if (currentUser) {
        setIsLiked(post.likes?.includes(currentUser.$id));
    }
    if (currentUserProfile && post) {
      setIsFollowing(currentUserProfile.following?.includes(post.userId) || false);
    }
  }, [currentUser, currentUserProfile, post]);

  const handleLike = async () => {
    if (!currentUser) return;
    
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);

    const currentLikes = post.likes || [];
    const newLikes = newIsLiked
      ? [...currentLikes, currentUser.$id]
      : currentLikes.filter((id: string) => id !== currentUser.$id);

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id, {
            likes: newLikes
        });
    } catch (error) {
        console.error("Failed to update likes:", error);
        setIsLiked(isLiked);
        setLikeCount(likeCount);
    }
  };
  
  const handleFollowToggle = async () => {
    if (!currentUser || !currentUserProfile || !post) return;
    
    const currentlyFollowing = currentUserProfile.following?.includes(post.userId) || false;
    setIsFollowing(!currentlyFollowing);
    setIsLoadingFollow(true);

    try {
        const [myProfile, otherUserProfile] = await Promise.all([
            databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id),
            databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId)
        ]);

        const myCurrentFollowing = myProfile.following || [];
        const theirCurrentFollowers = otherUserProfile.followers || [];
        const isCurrentlyFollowingNow = myCurrentFollowing.includes(post.userId);

        const newMyFollowing = isCurrentlyFollowingNow
            ? myCurrentFollowing.filter((id: string) => id !== post.userId)
            : [...myCurrentFollowing, post.userId];

        const newTheirFollowers = isCurrentlyFollowingNow
            ? theirCurrentFollowers.filter((id: string) => id !== currentUser.$id)
            : [...theirCurrentFollowers, currentUser.$id];
        
        await Promise.all([
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { following: newMyFollowing }),
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId, { followers: newTheirFollowers })
        ]);
        
        await recheckUser();

        toast({
            title: isCurrentlyFollowingNow ? 'Unfollowed' : 'Followed',
            description: isCurrentlyFollowingNow ? `You are no longer following ${post.username}.` : `You are now following ${post.username}.`
        });

    } catch (error: any) {
        setIsFollowing(currentlyFollowing);
        console.error("Failed to follow/unfollow user:", error);
        toast({ title: 'Error', description: `Could not complete action: ${error.message}`, variant: 'destructive' });
    } finally {
        setIsLoadingFollow(false);
    }
  };


  const fetchComments = useCallback(async () => {
    if (!post) return;
    setCommentsLoading(true);
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_POST_COMMENTS,
            [
                Query.equal('postId', post.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );
        setComments(response.documents);
    } catch (error) {
        console.error("Failed to fetch comments", error);
        toast({ title: "Error", description: "Could not load comments.", variant: 'destructive' });
    } finally {
        setCommentsLoading(false);
    }
  }, [post, toast]);

  useEffect(() => {
    if (showComments) {
        fetchComments();
    }
  }, [showComments, fetchComments]);

  const onCommentPosted = () => {
      fetchComments();
      setCommentCount(prev => prev + 1);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/dashboard/media/post/${post.$id}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link Copied!' });
  };

  const handleSendEmail = () => {
    const subject = `Check out this post from ${post.username} on I-Pay`;
    const body = `I thought you would like this post: ${window.location.origin}/dashboard/media/post/${post.$id}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const handleDownload = async (url: string, filename: string, postType: string) => {
    if (!url) return;
    toast({ title: "Preparing download..." });

    try {
        if (postType === 'image') {
            const image = new window.Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    toast({ title: "Error", description: "Could not create canvas for watermarking.", variant: "destructive" });
                    return;
                }
                
                // Draw the image
                ctx.drawImage(image, 0, 0);

                // Add watermark
                const watermarkText = "From I-pay online business and transaction";
                ctx.font = `bold ${Math.max(20, image.width / 30)}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'center';
                ctx.fillText(watermarkText, canvas.width / 2, canvas.height - 30);
                
                // Trigger download
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `watermarked-${filename || 'ipay-media'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast({ title: "Download started" });
            };
            image.onerror = () => {
                 toast({ title: "Error", description: "Could not load image for watermarking. Downloading original instead.", variant: "destructive" });
                 // Fallback to direct download
                 const link = document.createElement('a');
                 link.href = url;
                 link.target = "_blank";
                 link.download = filename || 'ipay-media-download';
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
            }
            const response = await fetch(url);
            const blob = await response.blob();
            image.src = URL.createObjectURL(blob);
        } else {
            // For video/music, just download directly
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.download = filename || 'ipay-media-download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Download started" });
        }
    } catch (error) {
        console.error("Download error:", error);
        toast({ title: "Download Failed", description: "An error occurred while preparing the file.", variant: "destructive" });
    }
};


  return (
    <div className={cn("relative h-[calc(100vh-170px)] bg-black flex flex-col justify-between text-white snap-start", isRotated && "fixed inset-0 z-[60] h-screen w-screen p-0")}>
      {/* Header */}
       <div className={cn("absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10", isRotated && "hidden")}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={post.userAvatar || `https://picsum.photos/seed/${post.userId}/100/100`} />
                        <AvatarFallback>{post.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{post.username}</p>
                        <p className="text-xs text-neutral-300">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p>
                    </div>
                </div>
                 {currentUser?.$id !== post.userId && (
                    <Button 
                        variant={isFollowing ? 'secondary' : 'outline'}
                        size="sm" 
                        className="bg-transparent text-white border-white disabled:opacity-70"
                        onClick={handleFollowToggle}
                        disabled={isLoadingFollow || !currentUser}
                    >
                        {isLoadingFollow ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                 )}
            </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {post.type === 'text' && (
          <div className={cn("h-full w-full flex items-center justify-center p-8 text-center", post.backgroundColor)}>
            <h2 className="text-3xl font-bold whitespace-pre-wrap">{post.text}</h2>
          </div>
        )}
        {post.type === 'image' && post.mediaUrl && (
          <Image src={post.mediaUrl} alt={post.description || 'Post image'} fill className="object-contain" />
        )}
        {(post.type === 'reels' || post.type === 'film') && post.mediaUrl && (
           <video src={post.mediaUrl} controls autoPlay muted loop className={cn("w-full h-full object-contain", isRotated && "object-cover")} />
        )}
        {post.type === 'music' && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <Music className="h-32 w-32 mb-4"/>
                <h2 className="text-2xl font-bold">{post.description || 'Untitled Track'}</h2>
                {post.mediaUrl && <audio controls src={post.mediaUrl} className="mt-8 w-full max-w-sm"></audio>}
            </div>
        )}
      </div>
      
      {/* Actions */}
       <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-4 z-10", isRotated && "hidden")}>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1" onClick={handleLike}>
                <Heart className={cn("h-7 w-7", isLiked && "fill-red-500 text-red-500")} />
                <span className="text-xs">{likeCount}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1" onClick={() => setShowComments(true)}>
                <MessageCircle className="h-7 w-7" />
                <span className="text-xs">{commentCount}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1">
                  <Share className="h-7 w-7" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Send to Email</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {post.allowDownload && post.mediaUrl && (
                <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1" onClick={() => handleDownload(post.mediaUrl, post.description, post.type)}>
                    <Download className="h-7 w-7" />
                </Button>
            )}
      </div>

        {/* Film-only Rotate Button */}
        {post.type === 'film' && (
        <Button variant="ghost" size="icon" className="h-12 w-12 text-white flex-col gap-1 absolute right-4 bottom-20 z-20 bg-black/20 hover:bg-black/40" onClick={() => setIsRotated(!isRotated)}>
            <RotateCw className="h-7 w-7" />
        </Button>
        )}

      {/* Footer */}
      <div className={cn("p-4 bg-gradient-to-t from-black/50 to-transparent z-10", isRotated && "hidden")}>
        <p className="text-sm">{post.description}</p>
      </div>

       <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col text-black dark:text-white">
            <SheetHeader>
            <SheetTitle>Comments ({commentCount})</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {commentsLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : comments.length > 0 ? (
                    comments.map(comment => <CommentItem key={comment.$id} comment={comment} />)
                ) : (
                    <p className="text-center text-muted-foreground">No comments yet.</p>
                )}
            </div>
            <div className="mt-auto p-4 border-t">
                 <CommentInput postId={post.$id} onCommentPosted={onCommentPosted} />
            </div>
        </SheetContent>
      </Sheet>
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

    const unsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_POSTS}.documents`, response => {
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
            size="icon"
            variant="destructive"
            className="absolute bottom-24 left-6 md:bottom-6 h-16 w-16 rounded-full z-20 shadow-lg"
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
