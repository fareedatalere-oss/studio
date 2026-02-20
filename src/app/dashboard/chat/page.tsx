'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MoreVertical, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { formatDistanceToNow } from 'date-fns';

export default function ChatPage() {
  const { user: currentUser, loading: userLoading } = useUser();
  
  // For 'All Users' tab
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  
  // For 'Recent' tab
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(true);

  const [search, setSearch] = useState('');

  // Fetch all users for the 'All' tab
  useEffect(() => {
    if (!currentUser) return;
    
    setUsersLoading(true);
    const fetchUsers = async () => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_PROFILES,
                [Query.limit(100)] // Fetch up to 100 users
            );
            // Filter out the current user from the list
            const otherUsers = response.documents.filter(doc => doc.$id !== currentUser.$id);
            setAllUsers(otherUsers);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setUsersLoading(false);
        }
    };
    fetchUsers();
  }, [currentUser]);

  // Fetch recent chats and subscribe to updates
  useEffect(() => {
    if (!currentUser) return;

    const fetchRecentChats = async () => {
        setRecentsLoading(true);
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_CHATS,
                [
                    Query.equal('participants', currentUser.$id),
                    Query.orderDesc('lastMessageAt')
                ]
            );

            // For each chat, get the other user's profile
            const chatsWithData = await Promise.all(response.documents.map(async (chat) => {
                const otherUserId = chat.participants.find((p: string) => p !== currentUser.$id);
                if (!otherUserId) return null;

                try {
                    const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                    return { ...chat, otherUser: userProfile };
                } catch {
                    // Handle case where profile might not exist
                    return { ...chat, otherUser: { $id: otherUserId, username: 'Unknown User' }};
                }
            }));

            setRecentChats(chatsWithData.filter(Boolean)); // Filter out any nulls

        } catch (error) {
            console.error("Failed to fetch recent chats:", error);
        } finally {
            setRecentsLoading(false);
        }
    };
    
    fetchRecentChats();

    const unsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_CHATS}.documents`, response => {
      // Very basic implementation: just refetch everything on any change.
      // A more optimized approach would be to check response.events and update state accordingly.
      if ((response.payload as any).participants?.includes(currentUser.$id)) {
        fetchRecentChats();
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredAllUsers = allUsers.filter(user => 
      (user.username && user.username.toLowerCase().includes(search.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(search.toLowerCase()))
  );
  
  const filteredRecentChats = recentChats.filter(chat =>
      (chat.otherUser?.username && chat.otherUser.username.toLowerCase().includes(search.toLowerCase())) ||
      (chat.otherUser?.email && chat.otherUser.email.toLowerCase().includes(search.toLowerCase()))
  );

  const UserItem = ({ user }: { user: any }) => {
    const displayName = user.username || user.email || 'I-Pay User';
    const fallback = displayName.charAt(0).toUpperCase();

    return (
     <div className="flex items-center justify-between">
        <Link href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 flex-1">
            <Avatar>
              <AvatarImage src={user.avatar} alt={displayName} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <span className="font-semibold">{displayName}</span>
                 {user.email && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
            </div>
        </Link>
    </div>
  )};
  
   const RecentChatItem = ({ chat }: { chat: any }) => {
    const displayName = chat.otherUser.username || chat.otherUser.email || 'I-Pay User';
    const fallback = displayName.charAt(0).toUpperCase();

    return (
     <div className="flex items-center justify-between">
        <Link href={`/dashboard/chat/${chat.otherUser.$id}`} className="flex items-center gap-3 flex-1">
            <Avatar>
              <AvatarImage src={chat.otherUser.avatar} alt={displayName} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <div className="flex justify-between items-center">
                    <span className="font-semibold">{displayName}</span>
                    <span className="text-xs text-muted-foreground">
                        {chat.lastMessageAt ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true }) : ''}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
            </div>
        </Link>
    </div>
  )};

  const renderLoadingSkeleton = () => (
      <div className="p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                  </div>
              </div>
          ))}
      </div>
  );

  const renderAllUsers = () => {
    if (usersLoading) return renderLoadingSkeleton();
    if (filteredAllUsers.length > 0) {
      return <div className="p-4 space-y-4">{filteredAllUsers.map(user => <UserItem key={user.$id} user={user} />)}</div>;
    }
    return <p className="text-center text-muted-foreground p-8">No other users found.</p>
  }
  
  const renderRecentChats = () => {
    if (recentsLoading) return renderLoadingSkeleton();
    if (filteredRecentChats.length > 0) {
      return <div className="p-4 space-y-4">{filteredRecentChats.map(chat => <RecentChatItem key={chat.$id} chat={chat} />)}</div>;
    }
    return <p className="text-center text-muted-foreground p-8">No recent chats. Start a conversation from the 'All' tab.</p>
  }

  if (userLoading) {
    return <div className="container py-4">{renderLoadingSkeleton()}</div>
  }

  return (
    <div className="container py-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
            placeholder="Search for a user..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {renderAllUsers()}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
             <CardContent className="p-0">
               {renderRecentChats()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
