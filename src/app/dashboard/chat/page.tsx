
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, MoreVertical, Trash2, Video } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import client, { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES, Query } from '@/lib/appwrite';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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


// Recent Chat Item Component
const RecentChatItem = ({ chat, currentUser, onAction }: { chat: any, currentUser: any, onAction: () => void }) => {
    const { toast } = useToast();
    const [unreadCount, setUnreadCount] = useState(0);
    const displayName = chat.otherUser?.username || 'Unknown User';
    
    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                    Query.equal('chatId', chat.$id),
                    Query.equal('status', 'sent'),
                    Query.notEqual('senderId', currentUser.$id),
                    Query.limit(1)
                ]);
                setUnreadCount(response.total);
            } catch (e) {
                console.log("Error fetching unread messages for chat item");
            }
        };
        fetchUnread();
    }, [chat.$id, currentUser.$id]);

    const handleDeleteForMe = async (chatId: string) => {
        toast({ title: 'Deleting Chat...', description: `Removing chat from your list.` });
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId);
            toast({ title: 'Success', description: 'Chat has been removed from your list.' });
            onAction(); // Trigger a refetch in the parent component
        } catch (error: any) {
            toast({ title: 'Error', description: `Could not delete chat: ${error.message}`, variant: 'destructive' });
        }
    };
    
    const handleDeleteForEveryone = async (chatId: string, username: string) => {
        toast({ title: 'Deleting Chat for Everyone...', description: `This may take a moment.` });
        try {
            // First, delete all messages in the chat
            let hasMore = true;
            while(hasMore) {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                    Query.equal('chatId', chatId),
                    Query.limit(25) // Delete in batches
                ]);
                
                if (response.documents.length > 0) {
                    await Promise.all(response.documents.map(doc => databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, doc.$id)));
                }
                
                hasMore = response.documents.length === 25;
            }

            // Then, delete the chat document itself
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId);
            
            toast({ title: 'Success', description: `Chat with ${username} has been deleted for everyone.` });
            onAction(); // Refetch
        } catch (error: any) {
            toast({ title: 'Error', description: `Could not delete chat for everyone: ${error.message}`, variant: 'destructive' });
        }
    };

    if (!chat.otherUser) return null;

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
            <Link href={`/dashboard/chat/${chat.otherUser.$id}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={chat.otherUser.avatar} />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center gap-2">
                        <p className="font-bold text-sm truncate">{displayName}</p>
                        <p className="text-[9px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                        </p>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-4 justify-center rounded-full p-0.5 text-[8px]">
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                </div>
            </Link>
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive text-xs">Delete Chat</DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat with {displayName}?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => handleDeleteForEveryone(chat.$id, displayName)} className="bg-destructive hover:bg-destructive/90">Delete for Everyone</AlertDialogAction>
                        <AlertDialogAction onClick={() => handleDeleteForMe(chat.$id)} variant="secondary">Delete for Me</AlertDialogAction>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// All User Item Component
const AllUserItem = ({ user }: { user: any }) => (
    <Link href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
        <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <p className="font-bold text-sm">{user.username}</p>
            <p className="text-[10px] text-muted-foreground">{user.name}</p>
        </div>
    </Link>
);


export default function ChatPage() {
    const { user: currentUser } = useUser();
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [loading, setLoading] = useState({ all: true, recent: true });
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    const fetchAllUsers = useCallback(async () => {
        setLoading(prev => ({ ...prev, all: true }));
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PROFILES, [Query.limit(100)]);
            setAllUsers(response.documents);
        } catch (e: any) {
            toast({ title: "Error", description: `Could not load users: ${e.message}`, variant: 'destructive' });
        } finally {
            setLoading(prev => ({ ...prev, all: false }));
        }
    }, [toast]);

    const fetchRecentChats = useCallback(async () => {
        if (!currentUser) return;
        setLoading(prev => ({ ...prev, recent: true }));
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
                Query.contains('participants', currentUser.$id),
                Query.orderDesc('lastMessageAt')
            ]);

            const chatsWithData = await Promise.all(response.documents.map(async (chat) => {
                const otherUserId = chat.participants.find((p: string) => p !== currentUser.$id);
                if (!otherUserId) return null;
                try {
                    const otherUser = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                    return { ...chat, otherUser };
                } catch {
                    return null;
                }
            }));

            setRecentChats(chatsWithData.filter(Boolean));
        } catch (e: any) {
            console.error("Recent chats error:", e);
            setRecentChats([]);
        } finally {
            setLoading(prev => ({ ...prev, recent: false }));
        }
    }, [currentUser]);


    useEffect(() => {
        fetchAllUsers();
        fetchRecentChats();
    }, [fetchAllUsers, fetchRecentChats]);
    
    // Subscribe to chat updates for real-time list updates
    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTION_ID_CHATS}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`
        ], response => {
            fetchRecentChats();
        });
        return () => unsubscribe();
    }, [currentUser, fetchRecentChats]);


    const filteredAllUsers = useMemo(() =>
        allUsers.filter(u =>
            u.$id !== currentUser?.$id &&
            (u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        ), [allUsers, searchQuery, currentUser]
    );

    const filteredRecentChats = useMemo(() =>
        recentChats.filter(c =>
            c.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
        ), [recentChats, searchQuery]
    );

    const renderAllUsers = () => {
        if (loading.all) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
        if (filteredAllUsers.length === 0) return <p className="text-center text-muted-foreground p-8">No users found.</p>;
        return (
            <div className="space-y-1 pb-24">
                {filteredAllUsers.map(user => <AllUserItem key={user.$id} user={user} />)}
            </div>
        );
    };
    
    const renderRecentChats = () => {
        if (loading.recent) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
        if (filteredRecentChats.length === 0) return <p className="text-center text-muted-foreground p-8">You have no recent conversations.</p>;
        return (
            <div className="space-y-1 pb-24">
                {filteredRecentChats.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUser} onAction={fetchRecentChats} />)}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white text-gray-900 relative">
            <Tabs defaultValue="recent" className="flex flex-col h-full">
                <header className="sticky top-16 md:top-0 bg-white border-b p-3 z-10">
                    <TabsList className="grid w-full grid-cols-2 bg-muted text-gray-600 h-9">
                        <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="text-xs">All Users</TabsTrigger>
                    </TabsList>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 text-gray-900 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <TabsContent value="recent" className="p-2 m-0">
                        {renderRecentChats()}
                    </TabsContent>
                    <TabsContent value="all" className="p-2 m-0">
                        {renderAllUsers()}
                    </TabsContent>
                </main>
            </Tabs>

            {/* Meeting Button */}
            <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center z-50 pointer-events-none md:bottom-4">
                <Button 
                    asChild 
                    className="rounded-full h-12 px-6 shadow-2xl font-black uppercase tracking-widest gap-2 bg-primary pointer-events-auto animate-in slide-in-from-bottom-4"
                >
                    <Link href="/dashboard/meeting">
                        <Video className="h-4 w-4" />
                        Meeting
                    </Link>
                </Button>
            </div>
        </div>
    );
}
