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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MoreVertical, Search } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ChatPage() {
  const { user: currentUser, profile: currentUserProfile, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(true);

  const [search, setSearch] = useState('');

  // Fetch all users
  useEffect(() => {
    if (!currentUser) return;
    
    setUsersLoading(true);
    databases.listDocuments(DATABASE_ID, COLLECTION_ID_PROFILES, [Query.limit(100)])
      .then(response => {
        // Exclude current user from the list of all users
        setAllUsers(response.documents.filter(doc => doc.$id !== currentUser.$id));
      })
      .catch(error => console.error("Failed to fetch users:", error))
      .finally(() => setUsersLoading(false));
  }, [currentUser]);

  const fetchRecentChats = useCallback(async () => {
    if (!currentUser) return;
    setRecentsLoading(true);
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_CHATS,
            [
                Query.equal('participants', [currentUser.$id]),
                Query.orderDesc('lastMessageAt')
            ]
        );

        const chatsWithData = await Promise.all(response.documents.map(async (chat) => {
            const otherUserId = chat.participants.find((p: string) => p !== currentUser.$id);
            if (!otherUserId) return null;

            try {
                const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                
                // Get unread messages count
                const unreadResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                    Query.equal('chatId', [chat.$id]),
                    Query.equal('senderId', [otherUserId]),
                    Query.equal('status', ['sent', 'delivered'])
                ]);

                return { ...chat, otherUser: userProfile, unreadCount: unreadResponse.total };
            } catch {
                return { ...chat, otherUser: { $id: otherUserId, username: 'Unknown User', avatar: null }, unreadCount: 0 };
            }
        }));

        setRecentChats(chatsWithData.filter(Boolean));

    } catch (error: any) {
        console.error("Failed to fetch recent chats:", error);
         toast({
            variant: 'destructive',
            title: 'Could Not Load Chats',
            description: error.message || 'There was an issue fetching your conversations.'
        });
        setRecentChats([]);
    } finally {
        setRecentsLoading(false);
    }
  }, [currentUser, toast]);


  // Fetch recent chats and subscribe
  useEffect(() => {
    if (!currentUser) return;
    
    fetchRecentChats();

    const unsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_CHATS}.documents`, response => {
      // Check if the current user is a participant in the changed chat document
      if ((response.payload as any).participants?.includes(currentUser.$id)) {
        // Refetch the entire list to ensure order and content is correct
        fetchRecentChats();
      }
    });

    return () => unsubscribe();
  }, [currentUser, fetchRecentChats]);

    const handleBlockUser = async (otherUserId: string, otherUserName: string) => {
        if (!currentUserProfile) return;
        
        const currentBlocked = currentUserProfile.blockedUsers || [];
        if (currentBlocked.includes(otherUserId)) {
             toast({ title: 'Already Blocked', description: `You have already blocked ${otherUserName}.` });
             return;
        }

        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUserProfile.$id, {
                blockedUsers: [...currentBlocked, otherUserId]
            });
            toast({ title: 'User Blocked', description: `You have blocked ${otherUserName}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to block user.' });
        }
    };

    const handleDeleteChat = async (chatId: string) => {
        try {
            // A more robust solution would be a server function to delete all messages
            // For client-side, we can just delete the chat document itself which will remove it from recents
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId);
            setRecentChats(prev => prev.filter(c => c.$id !== chatId));
            toast({ title: 'Chat Deleted', description: 'The chat has been removed from your recents.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the chat.' });
        }
    };

  const filteredAllUsers = allUsers.filter(user => 
      (user.username && user.username.toLowerCase().includes(search.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(search.toLowerCase()))
  );
  
  const filteredRecentChats = recentChats.filter(chat =>
      (chat.otherUser?.username && chat.otherUser.username.toLowerCase().includes(search.toLowerCase())) ||
      (chat.otherUser?.email && chat.otherUser.email.toLowerCase().includes(search.toLowerCase()))
  );

  const UserItem = ({ user }: { user: any }) => (
     <Link href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 flex-1 p-2 rounded-md hover:bg-muted">
        <Avatar>
          <AvatarImage src={user.avatar} alt={user.username} />
          <AvatarFallback>{user.username?.charAt(0).toUpperCase() || 'I'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 truncate">
            <span className="font-semibold">{user.username || user.email}</span>
             {user.email && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
        </div>
    </Link>
  );
  
   const RecentChatItem = ({ chat }: { chat: any }) => {
    const displayName = chat.otherUser.username || chat.otherUser.email || 'I-Pay User';
    const fallback = displayName.charAt(0).toUpperCase();

    return (
     <div className="flex items-center justify-between hover:bg-muted p-2 rounded-md">
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
                 <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    {chat.unreadCount > 0 && <Badge className="h-5 w-5 justify-center p-0">{chat.unreadCount}</Badge>}
                </div>
            </div>
        </Link>
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBlockUser(chat.otherUser.$id, displayName)}>Block User</DropdownMenuItem>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">Delete Chat</DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete your chat history with {displayName}. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteChat(chat.$id)} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
      return <div className="p-4 space-y-2">{filteredAllUsers.map(user => <UserItem key={user.$id} user={user} />)}</div>;
    }
    return <p className="text-center text-muted-foreground p-8">No other users found.</p>
  }
  
  const renderRecentChats = () => {
    if (recentsLoading) return renderLoadingSkeleton();
    if (filteredRecentChats.length > 0) {
      return <div className="p-4 space-y-2">{filteredRecentChats.map(chat => <RecentChatItem key={chat.$id} chat={chat} />)}</div>;
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
