'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, UserPlus, UserCheck, MessageSquare, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_POSTS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Query, ID, Permission, Role } from 'appwrite';
import { useToast } from '@/hooks/use-toast';
import { PostCard } from '@/components/media-post-card';
import { cn } from '@/lib/utils';

export default function UserPublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser, profile: currentUserProfile, recheckUser } = useUser();
    const targetUserId = params.id as string;

    const [targetProfile, setTargetProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [isLoadingFollow, setIsLoadingFollow] = useState(false);

    const isFollowing = currentUserProfile?.following?.includes(targetUserId);

    const fetchData = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const [profileDoc, postsRes] = await Promise.all([
                databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, targetUserId),
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [
                    Query.equal('userId', targetUserId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(100)
                ])
            ]);

            setTargetProfile(profileDoc);
            
            const parsedPosts = postsRes.documents.map(post => {
                if (post.type === 'music' || post.type === 'film') {
                    const desc = post.description || '';
                    const catMatch = desc.match(/CAT:([^|]+)\|/);
                    const iconMatch = desc.match(/ICON:([^|]+)\|/);
                    return {
                        ...post,
                        category: catMatch ? catMatch[1] : 'General',
                        thumbnailUrl: iconMatch ? iconMatch[1] : ''
                    };
                }
                return post;
            });

            setPosts(parsedPosts);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load profile.' });
        } finally {
            setLoading(false);
        }
    }, [targetUserId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFollowToggle = async () => {
        if (!currentUser || !currentUserProfile || !targetUserId) return;
        const currentlyFollowing = isFollowing;
        setIsLoadingFollow(true);
        try {
            const myProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
            const theirProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, targetUserId);
            const newMyFollowing = !currentlyFollowing ? [...(myProfile.following || []), targetUserId] : myProfile.following.filter((id: string) => id !== targetUserId);
            const newTheirFollowers = !currentlyFollowing ? [...(theirProfile.followers || []), currentUser.$id] : theirProfile.followers.filter((id: string) => id !== currentUser.$id);
            await Promise.all([
                databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { following: newMyFollowing }),
                databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, targetUserId, { followers: newTheirFollowers })
            ]);
            if (!currentlyFollowing) {
                databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
                    userId: targetUserId, senderId: currentUser.$id, type: 'follow', title: 'New Follower', description: 'started following you.', isRead: false, link: `/dashboard/profile/connections?tab=followers`, createdAt: new Date().toISOString()
                }, [Permission.read(Role.user(targetUserId)), Permission.update(Role.user(targetUserId)), Permission.read(Role.user(currentUser.$id))]).catch(() => {});
            }
            await recheckUser();
            setTargetProfile({...theirProfile, followers: newTheirFollowers});
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoadingFollow(false);
        }
    };

    if (loading) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    }

    const postTypes = ["text", "image", "reels", "film", "music"];

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            <header className="p-4 pt-12 flex items-center justify-between border-b bg-muted/30 backdrop-blur-md sticky top-0 z-50">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-background/50 border shadow-sm"><ArrowLeft className="h-5 w-5" /></Button>
                <h1 className="font-black uppercase text-sm tracking-widest text-primary">Profile View</h1>
                <Button asChild variant="ghost" size="icon" className="rounded-full bg-background/50 border shadow-sm"><Link href={`/dashboard/chat/${targetUserId}`}><MessageSquare className="h-5 w-5" /></Link></Button>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="p-8 flex flex-col items-center text-center gap-4 bg-gradient-to-b from-muted/50 to-transparent">
                    <Avatar className="h-24 w-24 ring-4 ring-primary ring-offset-4 shadow-2xl">
                        <AvatarImage src={targetProfile.avatar} />
                        <AvatarFallback className="font-black text-2xl uppercase bg-primary text-white">{targetProfile.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">@{targetProfile.username}</h2>
                        <div className="flex items-center justify-center gap-4 mt-2">
                            <div className="text-center">
                                <p className="font-black text-lg">{targetProfile.followers?.length || 0}</p>
                                <p className="text-[10px] font-bold uppercase opacity-50">Followers</p>
                            </div>
                        </div>
                    </div>
                    {currentUser?.$id !== targetUserId && (
                        <Button variant={isFollowing ? 'secondary' : 'default'} className={cn("w-full max-w-[200px] rounded-full font-black uppercase tracking-widest h-12 shadow-lg", isFollowing ? "bg-green-500 text-white" : "bg-primary")} onClick={handleFollowToggle} disabled={isLoadingFollow}>
                            {isLoadingFollow ? <Loader2 className="animate-spin h-5 w-5" /> : isFollowing ? <><UserCheck className="mr-2 h-4 w-4" /> Unfollow</> : <><UserPlus className="mr-2 h-4 w-4" /> Follow</>}
                        </Button>
                    )}
                </div>

                <Tabs defaultValue="reels" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 bg-muted h-12 rounded-none p-1 border-y">
                        {postTypes.map(type => (
                            <TabsTrigger key={type} value={type} className="rounded-none font-black uppercase text-[9px] data-[state=active]:bg-primary data-[state=active]:text-white">
                                {type === 'reels' ? 'Reel' : type}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {postTypes.map(type => (
                        <TabsContent key={type} value={type} className="m-0 h-full">
                            <div className="flex flex-col snap-y snap-mandatory overflow-y-auto scroll-smooth">
                                {posts.filter(p => p.type === type).length > 0 ? (
                                    posts.filter(p => p.type === type).map(post => (
                                        <PostCard key={post.$id} post={post} isMuted={isMuted} onMuteChange={setIsMuted} />
                                    ))
                                ) : (
                                    <div className="py-20 text-center text-muted-foreground opacity-30 flex flex-col items-center gap-4"><Plus className="h-12 w-12" /><p className="font-black uppercase text-xs tracking-widest">No {type} posts yet</p></div>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}
