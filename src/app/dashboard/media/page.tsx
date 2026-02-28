'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, COLLECTION_ID_PROFILES, COLLECTION_ID_POST_COMMENTS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
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

const CommentInput = ({ postId, postOwnerId, onCommentPosted }: { postId: string, postOwnerId: string, onCommentPosted: () => void }) => {
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

      // Create notification for the post owner
      if (postOwnerId !== user.$id) {
        databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
          userId: postOwnerId,
          senderId: user.$id,
          type: 'comment',
          title: 'New Comment',
          description: `commented on your post: "${text.substring(0, 20)}..."`,
          isRead: false,
          link: `/dashboard/media`,
          createdAt: new Date().toISOString()
        }).catch(e => console.log("Notification trigger failed", e));
      }

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


const PostCard = ({ post: initialPost, isMuted, onMuteChange }: { post: any; isMuted: boolean; onMuteChange: (muted: boolean) => void; }) => {
  const { user: currentUser, profile: currentUserProfile, recheckUser } = useUser();
  const { toast } = useToast();
  
  const [post, setPost] = useState(initialPost);

  const postRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isLiked, setIsLiked] = useState(() => post.likes?.includes(currentUser?.$id));
  const [likeCount, setLikeCount] = useState(() => post.likes?.length || 0);
  const [isFollowing, setIsFollowing] = useState(() => currentUserProfile?.following?.includes(post.userId) || false);
  const [commentCount, setCommentCount] = useState(() => post.commentCount || 0);
  
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const postElement = postRef.current;
    if (!postElement) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                videoElement.play().catch(error => console.error("Video autoplay failed:", error));
            } else {
                videoElement.pause();
            }
        },
        { threshold: 0.5 }
    );

    observer.observe(postElement);

    return () => {
        if (postElement) {
            observer.unobserve(postElement);
        }
    };
  }, []);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (post.type !== 'reels' && post.type !== 'film') return;

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.muted = isMuted;
      
      const handleVolumeChange = () => {
        if (videoElement.muted !== isMuted) {
          onMuteChange(videoElement.muted);
        }
      };

      videoElement.addEventListener('volumechange', handleVolumeChange);
      return () => {
        if (videoElement) {
          videoElement.removeEventListener('volumechange', handleVolumeChange);
        }
      };
    }
  }, [isMuted, onMuteChange, post.type]);

  const handleAudioPlay = () => {
    document.querySelectorAll('audio').forEach(audioEl => {
      if (audioEl !== audioRef.current) {
        audioEl.pause();
      }
    });
  };

  useEffect(() => {
    setIsLiked(post.likes?.includes(currentUser?.$id));
    setLikeCount(post.likes?.length || 0);
    setCommentCount(post.commentCount || 0);
    if (currentUserProfile) {
      setIsFollowing(currentUserProfile.following?.includes(post.userId) || false);
    }
  }, [post, currentUser, currentUserProfile]);

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
        
        if (newIsLiked && post.userId !== currentUser.$id) {
          databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
            userId: post.userId,
            senderId: currentUser.$id,
            type: 'like',
            title: 'New Like',
            description: 'liked your post.',
            isRead: false,
            link: `/dashboard/media`,
            createdAt: new Date().toISOString()
          }).catch(e => console.log("Notification trigger failed", e));
        }

        setPost({...post, likes: newLikes});
    } catch (error) {
        setIsLiked(!newIsLiked);
        setLikeCount(likeCount);
        console.error("Failed to update likes:", error);
    }
  };
  
  const handleFollowToggle = async () => {
    if (!currentUser || !currentUserProfile || !post) return;
    
    const currentlyFollowing = isFollowing;
    setIsLoadingFollow(true);
    setIsFollowing(!currentlyFollowing);

    try {
        const myProfilePromise = databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
        const otherUserProfilePromise = databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId);
        const [myProfile, otherUserProfile] = await Promise.all([myProfilePromise, otherUserProfilePromise]);

        const myCurrentFollowing = myProfile.following || [];
        const theirCurrentFollowers = otherUserProfile.followers || [];
        
        const newMyFollowing = !currentlyFollowing
            ? [...myCurrentFollowing, post.userId]
            : myCurrentFollowing.filter((id: string) => id !== post.userId);

        const newTheirFollowers = !currentlyFollowing
            ? [...theirCurrentFollowers, currentUser.$id]
            : theirCurrentFollowers.filter((id: string) => id !== currentUser.$id);
        
        await Promise.all([
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { following: newMyFollowing }),
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId, { followers: newTheirFollowers })
        ]);

        if (!currentlyFollowing) {
          databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
            userId: post.userId,
            senderId: currentUser.$id,
            type: 'follow',
            title: 'New Follower',
            description: 'started following you.',
            isRead: false,
            link: `/dashboard/profile/connections?tab=followers`,
            createdAt: new Date().toISOString()
          }).catch(e => console.log("Notification trigger failed", e));
        }
        
        await recheckUser();

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

  const onCommentPostedAction = () => {
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

    try {
        if (postType === 'image') {
            toast({ title: "Adding watermark and preparing download..." });
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
                
                ctx.drawImage(image, 0, 0);

                const watermarkText = "From I-pay online business and transaction";
                const fontSize = Math.max(20, image.width / 40);
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'center';

                ctx.fillText(watermarkText, canvas.width / 2, fontSize + 20);
                ctx.fillText(watermarkText, canvas.width / 2, canvas.height - 20);
                
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `watermarked-${filename || 'ipay-media'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast({ title: "Download started" });
            };
            image.onerror = () => {
                 toast({ title: "Error", description: "Could not load image. Preparing direct download instead.", variant: "destructive" });
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
            toast({ title: "Preparing direct download...", description: "Watermarking is not available for video or audio files." });
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.download = filename || 'ipay-media-download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error("Download error:", error);
        toast({ title: "Download Failed", description: "An error occurred while preparing the file.", variant: "destructive" });
    }
};


  return (
    <div ref={postRef} className={cn("relative h-full w-full bg-black flex flex-col justify-center text-white snap-start shrink-0 overflow-hidden", isRotated && "fixed inset-0 z-40 h-screen w-screen p-0")}>
      {/* Header Overlay */}
       <div className={cn("absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-20", isRotated && "hidden")}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="ring-2 ring-primary/50">
                        <AvatarImage src={post.userAvatar || `https://picsum.photos/seed/${post.userId}/100/100`} />
                        <AvatarFallback>{post.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-sm">@{post.username}</p>
                        <p className="text-[10px] text-neutral-300">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p>
                    </div>
                </div>
                 {currentUser?.$id !== post.userId && (
                    <Button 
                        variant={isFollowing ? 'secondary' : 'default'}
                        size="sm" 
                        className="h-8 rounded-full text-xs font-bold px-4"
                        onClick={handleFollowToggle}
                        disabled={isLoadingFollow || !currentUser}
                    >
                        {isLoadingFollow ? <Loader2 className="animate-spin h-3 w-3" /> : isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                 )}
            </div>
      </div>

      {/* Content Layer (Fills Page) */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        {post.type === 'text' && (
          <div className={cn("h-full w-full flex items-center justify-center p-10 text-center", post.backgroundColor)}>
            <h2 className="text-3xl font-black leading-tight whitespace-pre-wrap">{post.text}</h2>
          </div>
        )}
        {post.type === 'image' && post.mediaUrl && (
          <Image src={post.mediaUrl} alt={post.description || 'Post image'} fill className="object-contain" priority />
        )}
        {(post.type === 'reels' || post.type === 'film') && post.mediaUrl && (
           <video ref={videoRef} src={post.mediaUrl} controls loop playsInline className={cn("w-full h-full object-contain", isRotated && "object-cover")} />
        )}
        {post.type === 'music' && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-900 w-full h-full">
                <div className="relative h-48 w-48 mb-8 rounded-full overflow-hidden border-4 border-primary animate-spin-slow">
                    <Image src="https://picsum.photos/seed/music/400/400" alt="vinyl" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Music className="h-12 w-12 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold">{post.description || 'Untitled Track'}</h2>
                {post.mediaUrl && <audio ref={audioRef} onPlay={handleAudioPlay} controls src={post.mediaUrl} className="mt-8 w-full max-w-sm"></audio>}
            </div>
        )}
      </div>
      
      {/* Right Action Sidebar (Overlay) */}
       <div className={cn("absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 p-2 z-20", isRotated && "hidden")}>
            <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white" onClick={handleLike}>
                    <Heart className={cn("h-8 w-8", isLiked && "fill-red-500 text-red-500")} />
                </Button>
                <span className="text-xs font-bold shadow-sm">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white" onClick={() => setShowComments(true)}>
                    <MessageCircle className="h-8 w-8" />
                </Button>
                <span className="text-xs font-bold shadow-sm">{commentCount}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white">
                  <Share className="h-8 w-8" />
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
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white" onClick={() => handleDownload(post.mediaUrl, post.description, post.type)}>
                    <Download className="h-8 w-8" />
                </Button>
            )}
      </div>

        {post.type === 'film' && (
        <Button variant="ghost" size="icon" className="h-12 w-12 text-white absolute right-4 bottom-24 z-20 bg-black/40 rounded-full hover:bg-black/60" onClick={() => setIsRotated(!isRotated)}>
            <RotateCw className="h-6 w-6" />
        </Button>
        )}

      {/* Footer Info Overlay */}
      <div className={cn("absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-10", isRotated && "hidden")}>
        <p className="text-sm font-medium line-clamp-2 max-w-[80%]">{post.description}</p>
      </div>

       <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col text-black dark:text-white rounded-t-3xl">
            <SheetHeader>
            <SheetTitle className="text-center font-black uppercase text-sm tracking-widest border-b pb-4">Comments ({commentCount})</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-hide">
                {commentsLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : comments.length > 0 ? (
                    comments.map(comment => <CommentItem key={comment.$id} comment={comment} />)
                ) : (
                    <p className="text-center text-muted-foreground py-10 italic">No comments yet. Be the first!</p>
                )}
            </div>
            <div className="mt-auto p-4 border-t bg-background pb-8">
                 <CommentInput postId={post.$id} postOwnerId={post.userId} onCommentPosted={onCommentPostedAction} />
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};


const PostFeed = ({ posts, isMuted, onMuteChange }: { posts: any[]; isMuted: boolean; onMuteChange: (muted: boolean) => void; }) => {
  if (!posts || posts.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Clapperboard className="h-12 w-12 opacity-20" />
            <p className="font-bold uppercase text-xs tracking-widest">No posts found</p>
        </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto snap-y snap-mandatory scroll-smooth">
      {posts.map(post => <PostCard key={post.$id} post={post} isMuted={isMuted} onMuteChange={onMuteChange} />)}
    </div>
  )
}

export default function MediaPage() {
  const [open, setOpen] = useState(false);
  const [isFeedMuted, setIsFeedMuted] = useState(true);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
        setLoading(true);
        const fetchAllPosts = async () => {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(100)
                ]);
                setAllPosts(response.documents);
            } catch (error) {
                console.error("Failed to fetch posts:", error);
            } finally {
              setLoading(false);
            }
        };
        fetchAllPosts();
        
        const unsubscribe = databases.client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_POSTS}.documents`], response => {
            const eventType = response.events[0];
            const payload = response.payload as any;

            if (eventType.includes('.create')) {
                 setAllPosts(prev => [payload, ...prev.filter(p => p.$id !== payload.$id)]);
            } else if (eventType.includes('.delete')) {
                setAllPosts(prev => prev.filter(p => p.$id !== payload.$id));
            } else if (eventType.includes('.update')) {
                 setAllPosts(prev => prev.map(p => p.$id === payload.$id ? payload : p));
            }
        });

        return () => unsubscribe();
    }, []);

    const filteredPosts = useMemo(() => {
        if (!searchQuery) {
        return allPosts;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return allPosts.filter(post =>
            (post.description?.toLowerCase().includes(lowercasedQuery)) ||
            (post.text?.toLowerCase().includes(lowercasedQuery)) ||
            (post.username?.toLowerCase().includes(lowercasedQuery))
        );
    }, [allPosts, searchQuery]);

    const getPostsForType = (type: string) => filteredPosts.filter(p => p.type === type);


  return (
    <div className="relative h-[calc(100vh-130px)] bg-black overflow-hidden">
      <Tabs defaultValue="reels" className="h-full flex flex-col">
        <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent">
          <div className="container px-0">
            <TabsList className="grid w-full grid-cols-5 bg-transparent h-12 text-white/60">
              <TabsTrigger value="text" className="data-[state=active]:bg-transparent data-[state=active]:text-white font-bold text-[10px] uppercase">Text</TabsTrigger>
              <TabsTrigger value="image" className="data-[state=active]:bg-transparent data-[state=active]:text-white font-bold text-[10px] uppercase">Image</TabsTrigger>
              <TabsTrigger value="reels" className="data-[state=active]:bg-transparent data-[state=active]:text-white font-bold text-[10px] uppercase">Reels</TabsTrigger>
              <TabsTrigger value="film" className="data-[state=active]:bg-transparent data-[state=active]:text-white font-bold text-[10px] uppercase">Film</TabsTrigger>
              <TabsTrigger value="music" className="data-[state=active]:bg-transparent data-[state=active]:text-white font-bold text-[10px] uppercase">Music</TabsTrigger>
            </TabsList>
             <div className="relative p-2 px-4 flex items-center gap-2">
                <div className='relative flex-1'>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
                    <Input
                        placeholder="Search posts..."
                        className="pl-9 h-8 bg-white/10 border-none text-white placeholder:text-white/30 text-xs rounded-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </div>
        </header>

        <div className="flex-1 h-full overflow-hidden">
          {loading ? (
             <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
          ) : (
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
        <SheetTrigger asChild>
           <Button
            size="icon"
            className="fixed bottom-24 right-6 h-14 w-14 rounded-full z-50 shadow-2xl bg-primary hover:bg-primary/90 border-2 border-white/20"
          >
            <Plus className="h-7 w-7" />
            <span className="sr-only">Add Media</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader>
            <SheetTitle className="text-center font-black uppercase text-sm tracking-widest pt-4">Create Master Post</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-8">
            <Link href="/dashboard/media/upload/text" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl p-4 bg-muted hover:bg-primary hover:text-white transition-all">
              <Type className="h-6 w-6" />
              <span className="text-[10px] font-bold uppercase">Text</span>
            </Link>
            <Link href="/dashboard/media/upload/image" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl p-4 bg-muted hover:bg-primary hover:text-white transition-all">
              <ImageIcon className="h-6 w-6" />
              <span className="text-[10px] font-bold uppercase">Image</span>
            </Link>
            <Link href="/dashboard/media/upload/reels" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl p-4 bg-muted hover:bg-primary hover:text-white transition-all">
              <Clapperboard className="h-6 w-6" />
              <span className="text-[10px] font-bold uppercase">Reels</span>
            </Link>
            <Link href="/dashboard/media/upload/film" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl p-4 bg-muted hover:bg-primary hover:text-white transition-all">
              <Film className="h-6 w-6" />
              <span className="text-[10px] font-bold uppercase">Film</span>
            </Link>
             <Link href="/dashboard/media/upload/music" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-2xl p-4 bg-muted hover:bg-primary hover:text-white transition-all">
              <Music className="h-6 w-6" />
              <span className="text-[10px] font-bold uppercase">Music</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
