'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';

function ConnectionsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { user: currentUser, profile: currentUserProfile, recheckUser, loading: userLoading } = useUser();

  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const defaultTab = searchParams.get('tab') || 'followers';

  const fetchConnections = useCallback(async (profile: any) => {
    setLoading(true);
    try {
      const [followerProfiles, followingProfiles] = await Promise.all([
        profile.followers?.length > 0
          ? Promise.all(profile.followers.map((id: string) => databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, id)))
          : Promise.resolve([]),
        profile.following?.length > 0
          ? Promise.all(profile.following.map((id: string) => databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, id)))
          : Promise.resolve([]),
      ]);
      setFollowers(followerProfiles);
      setFollowing(followingProfiles);
    } catch (error) {
      console.error("Failed to fetch connections", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load your connections.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUserProfile) {
      fetchConnections(currentUserProfile);
    } else if (!userLoading) {
        setLoading(false);
    }
  }, [currentUserProfile, userLoading, fetchConnections]);

  const handleUnfollow = async (userId: string, name: string) => {
    if (!currentUser || !currentUserProfile) return;

    // Optimistic update
    setFollowing(prev => prev.filter(user => user.$id !== userId));

    try {
        const theirProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);

        const myNewFollowing = currentUserProfile.following?.filter((id: string) => id !== userId) || [];
        const theirNewFollowers = theirProfile.followers?.filter((id: string) => id !== currentUser.$id) || [];

        await Promise.all([
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { following: myNewFollowing }),
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { followers: theirNewFollowers })
        ]);
        
        await recheckUser(); // Re-sync the main user hook

        toast({
            title: 'Unfollowed',
            description: `You are no longer following ${name}.`,
        });

    } catch (error) {
        // Revert optimistic update on failure
        setFollowing(following); 
        console.error("Unfollow failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not unfollow user.' });
    }
  };
  
    const handleRemoveFollower = async (userId: string, name: string) => {
    if (!currentUser || !currentUserProfile) return;

    // Optimistic update
    setFollowers(prev => prev.filter(user => user.$id !== userId));

    try {
        const theirProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);

        const myNewFollowers = currentUserProfile.followers?.filter((id: string) => id !== userId) || [];
        const theirNewFollowing = theirProfile.following?.filter((id: string) => id !== currentUser.$id) || [];
        
        await Promise.all([
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { followers: myNewFollowers }),
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { following: theirNewFollowing })
        ]);

        await recheckUser();

        toast({
            title: 'Follower Removed',
            description: `${name} is no longer following you.`,
        });

    } catch (error) {
        setFollowers(followers);
        console.error("Remove follower failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove follower.' });
    }
  };


  const filteredFollowers = followers.filter(user => user.username.toLowerCase().includes(search.toLowerCase()));
  const filteredFollowing = following.filter(user => user.username.toLowerCase().includes(search.toLowerCase()));

  const UserItem = ({ user, type }: { user: any, type: 'follower' | 'following' }) => (
     <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
        <Link href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 flex-1">
            <Avatar>
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback>{user.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <span className="font-semibold">{user.username}</span>
                <p className="text-sm text-muted-foreground">{user.name}</p>
            </div>
        </Link>
        {type === 'following' && (
            <Button variant="outline" size="sm" onClick={() => handleUnfollow(user.$id, user.username)}>Unfollow</Button>
        )}
         {type === 'follower' && (
            <Button variant="secondary" size="sm" onClick={() => handleRemoveFollower(user.$id, user.username)}>Remove</Button>
        )}
    </div>
  );
  
    const renderLoadingSkeleton = () => (
      <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                  </div>
              </div>
          ))}
      </div>
  );

  return (
    <div className="container py-8">
       <Link href="/dashboard/profile" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
            placeholder="Search for a user..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
          <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="followers">
          <Card>
            <CardContent className="p-4 space-y-2">
              {loading || userLoading ? renderLoadingSkeleton() : filteredFollowers.length > 0 ? (
                  filteredFollowers.map(user => <UserItem key={user.$id} user={user} type="follower" />)
              ) : (
                <p className="text-center text-muted-foreground p-6">You have no followers yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="following">
          <Card>
            <CardContent className="p-4 space-y-2">
               {loading || userLoading ? renderLoadingSkeleton() : filteredFollowing.length > 0 ? (
                  filteredFollowing.map(user => <UserItem key={user.$id} user={user} type="following" />)
              ) : (
                <p className="text-center text-muted-foreground p-6">You are not following anyone yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ConnectionsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <ConnectionsContent />
        </Suspense>
    )
}
