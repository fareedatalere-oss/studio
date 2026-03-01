
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Heart, MessageCircle, Share, MoreVertical, Download, Send, Loader2, Mail, Link as LinkIcon, UserPlus, UserCheck, User, MessageSquare, ChevronLeft, Music } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useUser } from '@/hooks/use-appwrite';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, COLLECTION_ID_PROFILES, COLLECTION_ID_POST_COMMENTS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Query, ID, Permission, Role } from 'appwrite';
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
      
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, ID.unique(), newComment);

      const post = await databases.getDocument(DATABASE_ID, COLLECTION_ID_POSTS, postId);
      const newCount = (post.commentCount || 0) + 1;
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_POSTS, postId, { commentCount: newCount });

      if (postOwnerId !== user.$id) {
        databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
          userId: postOwnerId, senderId: user.$id, type: 'comment', title: 'New Comment', description: `commented on your post.`, isRead: false, link: `/dashboard/media`, createdAt: new Date().toISOString()
        }, [
            Permission.read(Role.user(postOwnerId)),
            Permission.update(Role.user(postOwnerId)),
            Permission.read(Role.user(user.$id)),
        ]).catch(() => {});
      }

      setText('');
      onCommentPosted();
    } catch(e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Avatar><AvatarImage src={profile?.avatar} /><AvatarFallback>{profile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback></Avatar>
      <Input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." disabled={isSubmitting} />
      <Button type="submit" size="icon" disabled={isSubmitting || !text.trim()}>{isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}</Button>
    </form>
  )
}

export const PostCard = ({ post: initialPost, isMuted, onMuteChange }: { post: any; isMuted: boolean; onMuteChange: (muted: boolean) => void; }) => {
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
  const [uiVisible, setUiVisible] = useState(true);
  
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { videoElement.muted = isMuted; videoElement.play().catch(() => {}); }
        else videoElement.pause();
    }, { threshold: 0.1 });
    if (postRef.current) observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [isMuted]);

  const handleLike = async () => {
    if (!currentUser) return;
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);
    try {
        const currentLikes = post.likes || [];
        const newLikes = newIsLiked ? [...currentLikes, currentUser.$id] : currentLikes.filter((id: string) => id !== currentUser.$id);
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id, { likes: newLikes });
        if (newIsLiked && post.userId !== currentUser.$id) {
          databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
            userId: post.userId, senderId: currentUser.$id, type: 'like', title: 'New Like', description: 'liked your post.', isRead: false, link: `/dashboard/media`, createdAt: new Date().toISOString()
          }, [Permission.read(Role.user(post.userId)), Permission.update(Role.user(post.userId)), Permission.read(Role.user(currentUser.$id))]).catch(() => {});
        }
    } catch (e) { setIsLiked(!newIsLiked); setLikeCount(likeCount); }
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    clickCountRef.current++;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current >= 2) {
            if (!isLiked) handleLike();
        } else {
            if (post.type === 'reels' || post.type === 'film') {
                setUiVisible(!uiVisible);
            }
        }
        clickCountRef.current = 0;
    }, 250);
  };

  const handleFollowToggle = async () => {
    if (!currentUser || isLoadingFollow) return;
    const currentlyFollowing = isFollowing;
    setIsLoadingFollow(true);
    setIsFollowing(!currentlyFollowing);
    try {
        const myProf = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
        const theirProf = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId);
        const newMyFollowing = !currentlyFollowing ? [...(myProf.following || []), post.userId] : (myProf.following || []).filter((id: string) => id !== post.userId);
        const newTheirFollowers = !currentlyFollowing ? [...(theirProf.followers || []), currentUser.$id] : (theirProf.followers || []).filter((id: string) => id !== currentUser.$id);
        await Promise.all([
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { following: newMyFollowing }),
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, post.userId, { followers: newTheirFollowers })
        ]);
        await recheckUser();
    } catch (e) { setIsFollowing(currentlyFollowing); } finally { setIsLoadingFollow(false); }
  };

  const fetchComments = useCallback(async () => {
    if (!post) return;
    setCommentsLoading(true);
    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, [Query.equal('postId', post.$id), Query.orderDesc('$createdAt'), Query.limit(50)]);
        setComments(response.documents);
    } finally { setCommentsLoading(false); }
  }, [post]);

  useEffect(() => { if (showComments) fetchComments(); }, [showComments, fetchComments]);

  return (
    <div ref={postRef} className="relative h-screen w-full bg-background flex flex-col justify-center snap-start shrink-0 overflow-hidden border-b">
      <div className="absolute inset-0 flex items-center justify-center z-0" onClick={handleScreenClick}>
        {post.type === 'text' && (
          <div className={cn("h-full w-full flex flex-col items-center justify-center p-10 text-center", post.backgroundColor)}>
            <h2 className={cn("text-2xl font-black leading-tight whitespace-pre-wrap drop-shadow-md", (post.backgroundColor === 'bg-white' || !post.backgroundColor) ? 'text-black' : 'text-white')}>
                {post.text?.length > 200 ? post.text.substring(0, 200) + '...' : post.text}
                {post.text?.length > 200 && <Link href={`/dashboard/media/post/${post.$id}/text`} className="inline-block ml-2 text-primary font-black">{">"}</Link>}
            </h2>
          </div>
        )}
        {post.type === 'image' && post.mediaUrl && <Image src={post.mediaUrl} alt="image" fill className="object-contain" priority />}
        {(post.type === 'reels' || post.type === 'film') && post.mediaUrl && <video ref={videoRef} src={post.mediaUrl} controls={false} loop playsInline preload="auto" muted={isMuted} className="w-full h-full object-cover" />}
        {post.type === 'music' && (
            <div className="flex flex-col items-center justify-center p-8 text-center w-full h-full bg-muted/20">
                <div className="relative h-64 w-64 mb-10 rounded-full overflow-hidden border-8 border-primary animate-spin-slow">
                    <Image src={post.thumbnailUrl || "https://picsum.photos/seed/music/400/400"} alt="icon" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Music className="h-16 w-16 text-white" /></div>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{post.description?.split('|').pop() || 'Untitled'}</h2>
                <p className="text-xs font-bold text-primary mb-4 uppercase">{post.category || 'Music'}</p>
                {post.mediaUrl && <audio ref={audioRef} controls src={post.mediaUrl} muted={isMuted} className="mt-10 w-full max-w-xs"></audio>}
            </div>
        )}
      </div>
      
      <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-start gap-6 p-2 z-30 transition-opacity duration-300", !uiVisible && "opacity-0 pointer-events-none")}>
            <div className="flex flex-col items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="ring-2 ring-primary h-14 w-14 shadow-xl cursor-pointer">
                            <AvatarImage src={post.userAvatar} />
                            <AvatarFallback className="bg-primary text-white font-black">{post.username?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40 font-black uppercase text-[10px]">
                        <DropdownMenuItem asChild><Link href={`/dashboard/chat/${post.userId}`}><MessageSquare className="mr-2 h-4 w-4" /> Chat</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/dashboard/profile/view/${post.userId}`}><User className="mr-2 h-4 w-4" /> View</Link></DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <p className="font-black text-xs bg-background/50 px-2 py-1 rounded-full backdrop-blur-sm truncate max-w-[100px]">@{post.username}</p>
            </div>
            {currentUser?.$id !== post.userId && (
                <div className="flex flex-col items-center gap-1">
                    <Button variant={isFollowing ? 'secondary' : 'default'} size="icon" className="h-14 w-14 rounded-full shadow-2xl" onClick={handleFollowToggle} disabled={isLoadingFollow}>
                        {isLoadingFollow ? <Loader2 className="animate-spin h-6 w-6" /> : isFollowing ? <UserCheck className="h-8 w-8" /> : <UserPlus className="h-8 w-8" />}
                    </Button>
                    <span className="text-[10px] font-black uppercase">{isFollowing ? 'Unfollow' : 'Follow'}</span>
                </div>
            )}
            <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 shadow-xl border-2" onClick={handleLike}><Heart className={cn("h-8 w-8", isLiked && "fill-red-500 text-red-500")} /></Button>
                <span className="text-[10px] font-black">{likeCount}</span>
            </div>
      </div>

       <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 p-2 z-30 transition-opacity duration-300", !uiVisible && "opacity-0 pointer-events-none")}>
            <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 shadow-xl border-2" onClick={() => setShowComments(true)}><MessageCircle className="h-8 w-8" /></Button>
                <span className="text-[10px] font-black">{commentCount}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 shadow-xl border-2" onClick={() => onMuteChange(!isMuted)}>{isMuted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}</Button>
            {post.allowDownload && post.mediaUrl && <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-muted/40 shadow-xl border-2" onClick={() => window.open(post.mediaUrl)}><Download className="h-8 w-8" /></Button>}
      </div>

      <div className={cn("absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background/80 to-transparent z-10 transition-opacity duration-300", !uiVisible && "opacity-0")}>
        <p className="text-sm font-bold line-clamp-3 max-w-[75%]">{post.description?.split('|').pop()}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black">{formatDistanceToNow(new Date(post.$createdAt), { addSuffix: true })}</p>
      </div>

       <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col rounded-t-[2.5rem] border-t-4 border-primary">
            <SheetHeader><SheetTitle className="text-center font-black uppercase text-sm border-b pb-6">Comments ({commentCount})</SheetTitle></SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-hide">
                {commentsLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-10 w-10" /></div> : comments.length > 0 ? comments.map(c => <CommentItem key={c.$id} comment={c} />) : <p className="text-center text-muted-foreground py-16">No comments yet.</p>}
            </div>
            <div className="mt-auto p-6 border-t bg-background pb-10"><CommentInput postId={post.$id} postOwnerId={post.userId} onCommentPosted={() => { fetchComments(); setCommentCount(prev => prev + 1); }} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
