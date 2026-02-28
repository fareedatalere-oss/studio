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
} from '@/tabs';
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
  Volume2,
  VolumeX,
  ChevronRight,
  UserPlus,
  UserCheck,
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
  
  const TEXT_CHAR_LIMIT = 250;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const postElement = postRef.current;
    if (!postElement) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                videoElement.play().catch(() => {});
            } else {
                videoElement.pause();
            }
        },
        { threshold: 0.6 }
    );

    observer.observe(postElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.muted = isMuted;
    }
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.muted = isMuted;
    }
  }, [isMuted]);

  const toggleMute = () => {
    onMuteChange(!isMuted);
  };

  const handleAudioPlay = () => {
    document.querySelectorAll('audio').forEach(audioEl => {
      if (audioEl !== audioRef.current) {
        audioEl.pause();
      }
    });
  };

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
          }).catch(() => {});
        }

        setPost({...post, likes: newLikes});
    } catch (error) {
        setIsLiked(!newIsLiked);
        setLikeCount(likeCount);
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
          }).catch(() => {});
        }
        
        await recheckUser();

    } catch (error: any) {
        setIsFollowing(currentlyFollowing);
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
            toast({ title: "Processing download..." });
            const image = new window.Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(image, 0, 0);
                
                // Drawing the Watermark Icon
                const iconSize = Math.max(40, image.width / 15);
                const padding = 20;
                
                // Simple Circle Watermark with "IP" text
                ctx.beginPath();
                ctx.arc(canvas.width - iconSize/2 - padding, canvas.height - iconSize/2 - padding, iconSize/2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(2, 132, 199, 0.8)'; // Primary Blue
                ctx.fill();
                ctx.font = `bold ${iconSize/3}px Arial`;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText("I-Pay", canvas.width - iconSize/2 - padding, canvas.height - iconSize/2 - padding);

                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `ipay-${filename || 'media'}.png`;
                link.click();
            };
            const response = await fetch(url);
            const blob = await response.blob();
            image.src = URL.createObjectURL(blob);
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            link.download = filename || 'ipay-media-download';
            link.click();
        }
    } catch (error) {
        toast({ title: "Download Failed", variant: "destructive" });
    }
  };

  const isTextTooLong = post.type === 'text' && post.text.length > TEXT_CHAR_LIMIT;

  return (
    <div ref={postRef} className={cn("relative h-screen w-full bg-background flex flex-col justify-center snap-start shrink-0 overflow-hidden border-b", isRotated && "fixed inset-0 z-40 h-screen w-screen p-0 bg-black")}>
      
      {/* Content Layer */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        {post.type === 'text' && (
          <div className={cn("h-full w-full flex flex-col items-center justify-center p-10 text-center", post.backgroundColor)}>
            <div className="max-w-md w-full">
                <h2 className={cn("text-2xl font-black leading-tight whitespace-pre-wrap drop-shadow-md", (post.backgroundColor === 'bg-white' || !post.backgroundColor) ? 'text-black' : 'text-white')}>
                    {isTextTooLong ? `${post.text.substring(0, TEXT_CHAR_LIMIT)}...` : post.text}
                </h2>
                {isTextTooLong && (
                    <Link href={`/dashboard/media/post/${post.$id}/text`}>
                        <Button variant="ghost" className="mt-8 rounded-full font-black uppercase tracking-widest bg-white/10 hover:bg-white/30 border-2 border-white/20 text-white h-14 px-8 text-lg flex items-center gap-2">
                            <span>Read More</span>
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </Link>
                )}
            </div>
          </div>
        )}
        {post.type === 'image' && post.mediaUrl && (
          <Image src={post.mediaUrl} alt={post.description || 'Post image'} fill className="object-contain" priority />
        )}
        {(post.type === 'reels' || post.type === 'film') && post.mediaUrl && (
           <video ref={videoRef} src={post.mediaUrl} controls loop playsInline preload="auto" className={cn("w-full h-full object-contain", isRotated && "object-cover")} />
        )}
        {post.type === 'music' && (
            <div className="flex flex-col items-center justify-center p-8 text-center w-full h-full bg-muted/20">
                <div className="relative h-64 w-64 mb-10 rounded-full overflow-hidden border-8 border-primary animate-spin-slow shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                    <Image src={post.thumbnailUrl || "https://picsum.photos/seed/music/400/400"} alt="music icon" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Music className="h-16 w-16 text-white" />
                    </div>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">{post.description || 'Untitled Track'}</h2>
                {post.mediaUrl && <audio ref={audioRef} onPlay={handleAudioPlay} controls src={post.mediaUrl} className="mt-10 w-full max-w-sm"></audio>}
            </div>
        )}
      </div>
      
      {/* Left Sidebar - Poster Info & Like Button */}
      <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-start gap-6 p-2 z-20 transition-all", isRotated && "hidden")}>
            <div className="flex flex-col items-center gap-2">
                <Avatar className="ring-2 ring-primary h-14 w-14 shadow-xl">
                    <AvatarImage src={post.userAvatar} />
                    <AvatarFallback className="bg-primary text-white font-black uppercase">{post.username?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <p className="font-black text-xs text-foreground bg-background/50 px-2 py-1 rounded-full backdrop-blur-sm shadow-sm truncate max-w-[100px]">@{post.username}</p>
            </div>

            {currentUser?.$id !== post.userId && (
                <div className="flex flex-col items-center gap-1">
                    <Button 
                        variant={isFollowing ? 'secondary' : 'default'} 
                        size="icon" 
                        className={cn("h-14 w-14 rounded-full shadow-2xl border-2 border-primary/10 transition-all", isFollowing ? 'bg-green-500 text-white' : 'bg-primary text-white')}
                        onClick={handleFollowToggle}
                        disabled={isLoadingFollow || !currentUser}
                    >
                        {isLoadingFollow ? <Loader2 className="animate-spin h-6 w-6" /> : isFollowing ? <UserCheck className="h-8 w-8" /> : <UserPlus className="h-8 w-8" />}
                    </Button>
                    <span className="text-[10px] font-black text-foreground uppercase drop-shadow-sm">{isFollowing ? 'Unfollow' : 'Follow'}</span>
                </div>
            )}

            <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground shadow-xl border-2 border-border/10" onClick={handleLike}>
                    <Heart className={cn("h-8 w-8", isLiked && "fill-red-500 text-red-500")} />
                </Button>
                <span className="text-[10px] font-black text-foreground drop-shadow-sm">{likeCount}</span>
            </div>
      </div>

      {/* Right Sidebar - Other Interactions */}
       <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 p-2 z-20", isRotated && "hidden")}>
            <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground shadow-xl border-2 border-border/10" onClick={() => setShowComments(true)}>
                    <MessageCircle className="h-8 w-8" />
                </Button>
                <span className="text-[10px] font-black text-foreground drop-shadow-sm">{commentCount}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground shadow-xl border-2 border-border/10">
                  <Share className="h-8 w-8" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background">
                <DropdownMenuItem onClick={handleCopyLink} className="font-bold uppercase text-xs">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendEmail} className="font-bold uppercase text-xs">
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Send to Email</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(post.type === 'reels' || post.type === 'film' || post.type === 'music') && (
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground shadow-xl border-2 border-border/10" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
                </Button>
            )}

            {post.allowDownload && post.mediaUrl && (
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 hover:bg-muted/60 text-foreground shadow-xl border-2 border-border/10" onClick={() => handleDownload(post.mediaUrl, post.description, post.type)}>
                    <Download className="h-8 w-8" />
                </Button>
            )}
      </div>

        {post.type === 'film' && (
        <Button variant="ghost" size="icon" className="h-14 w-14 text-foreground absolute left-6 bottom-24 z-20 bg-muted/50 rounded-full hover:bg-muted/70 shadow-2xl border border-border/20" onClick={() => setIsRotated(!isRotated)}>
            <RotateCw className="h-8 w-8" />
        </Button>
        )}

      <div className={cn("absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background/80 via-background/40 to-transparent z-10", isRotated && "hidden")}>
        <p className="text-sm font-bold text-foreground line-clamp-3 max-w-[75%] drop-shadow-sm leading-tight">{post.description}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p>
      </div>

       <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col text-foreground rounded-t-[2.5rem] border-t-4 border-primary shadow-2xl">
            <SheetHeader>
            <SheetTitle className="text-center font-black uppercase text-sm tracking-[0.2em] border-b pb-6">Comments ({commentCount})</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-hide">
                {commentsLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-primary h-10 w-10" />
                    </div>
                ) : comments.length > 0 ? (
                    comments.map(comment => <CommentItem key={comment.$id} comment={comment} />)
                ) : (
                    <p className="text-center text-muted-foreground py-16 italic font-medium">No comments yet. Be the first to share your thoughts!</p>
                )}
            </div>
            <div className="mt-auto p-6 border-t bg-background pb-10 shadow-inner">
                 <CommentInput postId={initialPost.$id} postOwnerId={initialPost.userId} onCommentPosted={onCommentPostedAction} />
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const PostFeed = ({ posts, isMuted, onMuteChange }: { posts: any[]; isMuted: boolean; onMuteChange: (muted: boolean) => void; }) => {
  if (!posts || posts.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-6">
            <div className="p-8 bg-muted rounded-full">
                <Clapperboard className="h-16 w-16 opacity-30" />
            </div>
            <p className="font-black uppercase text-sm tracking-[0.3em]">No posts found</p>
        </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide">
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
            if (!response.events?.some(e => e.includes('.update') || e.includes('.create') || e.includes('.delete'))) return;
            
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
    <div className="relative h-screen bg-background overflow-hidden">
      
      <Tabs defaultValue="reels" className="h-full flex flex-col">
        <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-background/60 via-background/30 to-transparent pt-12 pb-8">
          <div className="container px-0">
            <TabsList className="grid w-full grid-cols-5 bg-transparent h-12">
              <TabsTrigger value="text" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider text-foreground/80">Text</TabsTrigger>
              <TabsTrigger value="image" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider text-foreground/80">Image</TabsTrigger>
              <TabsTrigger value="reels" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider text-foreground/80">Reels</TabsTrigger>
              <TabsTrigger value="film" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider text-foreground/80">Film</TabsTrigger>
              <TabsTrigger value="music" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[11px] uppercase tracking-wider text-foreground/80">Music</TabsTrigger>
            </TabsList>
             <div className="relative p-2 px-6 flex items-center gap-2 mt-2">
                <div className='relative flex-1'>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
                    <Input
                        placeholder="Search posts..."
                        className="pl-10 h-10 bg-background/30 border-border/10 text-xs rounded-full focus-visible:ring-1 focus-visible:ring-primary text-foreground placeholder:text-foreground/40 backdrop-blur-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </div>
        </header>

        <div className="flex-1 h-full overflow-hidden">
          {loading ? (
             <div className="h-full w-full flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>
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
            className="fixed bottom-10 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full z-50 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-primary hover:bg-primary/90 border-4 border-white/20 animate-bounce-slow"
          >
            <Plus className="h-8 w-8" />
            <span className="sr-only">Add Media</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[3rem] pb-12 shadow-2xl border-t-4 border-primary">
          <SheetHeader>
            <SheetTitle className="text-center font-black uppercase text-xs tracking-[0.4em] pt-6">Create Post</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-6 py-10 px-4">
            <Link href="/dashboard/media/upload/text" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all shadow-md group">
              <Type className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Text</span>
            </Link>
            <Link href="/dashboard/media/upload/image" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all shadow-md group">
              <ImageIcon className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Image</span>
            </Link>
            <Link href="/dashboard/media/upload/reels" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all shadow-md group">
              <Clapperboard className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Reels</span>
            </Link>
            <Link href="/dashboard/media/upload/film" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all shadow-md group">
              <Film className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Film</span>
            </Link>
             <Link href="/dashboard/media/upload/music" onClick={() => setOpen(false)} className="flex flex-col items-center gap-3 rounded-[2rem] p-6 bg-muted hover:bg-primary hover:text-white transition-all shadow-md group">
              <Music className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Music</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
