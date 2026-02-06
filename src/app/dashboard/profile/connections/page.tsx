'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const mockFollowers: any[] = [];
const mockFollowing: any[] = [];


function ConnectionsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [following, setFollowing] = useState(mockFollowing);
  const defaultTab = searchParams.get('tab') || 'followers';

  const handleUnfollow = (userId: string, name: string) => {
    setFollowing(prev => prev.filter(user => user.id !== userId));
    toast({
      title: 'Unfollowed',
      description: `You are no longer following ${name}.`,
    });
  };

  const filteredFollowers = mockFollowers.filter(user => user.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFollowing = following.filter(user => user.name.toLowerCase().includes(search.toLowerCase()));

  const UserItem = ({ user, type }: { user: {id: string, name: string, avatar: string}, type: 'follower' | 'following' }) => (
     <div className="flex items-center justify-between">
        <Link href={`/dashboard/chat/${user.id}`} className="flex items-center gap-3 flex-1">
            <Avatar>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <span className="font-semibold">{user.name}</span>
            </div>
        </Link>
        {type === 'following' && (
            <Button variant="outline" size="sm" onClick={() => handleUnfollow(user.id, user.name)}>Unfollow</Button>
        )}
         {type === 'follower' && (
            <Button variant="secondary" size="sm">Remove</Button>
        )}
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
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="followers">
          <Card>
            <CardContent className="p-4 space-y-4">
              {filteredFollowers.length > 0 ? (
                  filteredFollowers.map(user => <UserItem key={user.id} user={user} type="follower" />)
              ) : (
                <p className="text-center text-muted-foreground p-6">You have no followers yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="following">
          <Card>
            <CardContent className="p-4 space-y-4">
               {filteredFollowing.length > 0 ? (
                  filteredFollowing.map(user => <UserItem key={user.id} user={user} type="following" />)
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
        <Suspense fallback={<div>Loading...</div>}>
            <ConnectionsContent />
        </Suspense>
    )
}
