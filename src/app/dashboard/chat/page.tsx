'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, MoreVertical, Trash2, UserX } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
    const displayName = chat.otherUser?.username || 'Unknown User';
    
    const handleBlockUser = async (userId: string, username: string) => {
         toast({ title: "Feature coming soon", description: `Blocking for ${username} will be available shortly.` });
    };

    const handleDeleteChat = async (chatId: string, username: string) => {
        toast({ title: 'Deleting Chat...', description: `Removing conversation with ${username}.` });
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId);
            toast({ title: 'Success', description: 'Chat has been deleted.' });
            onAction(); // Trigger a refetch in the parent component
        } catch (error: any) {
            toast({ title: 'Error', description: `Could not delete chat: ${error.message}`, variant: 'destructive' });
        }
    };

    if (!chat.otherUser) return null;

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors">
            <Link href={`/dashboard/chat/${chat.otherUser.$id}`} className="flex-1 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.otherUser.avatar} />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold truncate">{displayName}</p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                        </p>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{chat.lastMessage}</p>
                </div>
            </Link>
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical /></Button>
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
                        <AlertDialogAction onClick={() => handleDeleteChat(chat.$id, displayName)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// All User Item Component
const AllUserItem = ({ user }: { user: any }) => (
    <Link href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors">
        <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <p className="font-semibold">{user.username}</p>
            <p className="text-sm text-gray-400">{user.name}</p>
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
                Query.equal('participants', currentUser.$id),
                Query.orderDesc('lastMessageAt')
            ]);

            const chatsWithData = await Promise.all(response.documents.map(async (chat) => {
                const otherUserId = chat.participants.find((p: string) => p !== currentUser.$id);
                if (!otherUserId) return null;
                const otherUser = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                return { ...chat, otherUser };
            }));

            setRecentChats(chatsWithData.filter(Boolean));
        } catch (e: any) {
            toast({ title: "Error", description: `Could not load recent chats: ${e.message}`, variant: 'destructive' });
        } finally {
            setLoading(prev => ({ ...prev, recent: false }));
        }
    }, [currentUser, toast]);


    useEffect(() => {
        fetchAllUsers();
        fetchRecentChats();
    }, [fetchAllUsers, fetchRecentChats]);
    
    // Subscribe to chat updates for real-time list updates
    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = account.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_CHATS}.documents`, response => {
            // A chat was created or updated, refetch the list
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
        if (filteredAllUsers.length === 0) return <p className="text-center text-gray-400 p-8">No users found.</p>;
        return (
            <div className="space-y-2">
                {filteredAllUsers.map(user => <AllUserItem key={user.$id} user={user} />)}
            </div>
        );
    };
    
    const renderRecentChats = () => {
        if (loading.recent) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
        if (filteredRecentChats.length === 0) return <p className="text-center text-gray-400 p-8">You have no recent conversations.</p>;
        return (
            <div className="space-y-2">
                {filteredRecentChats.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUser} onAction={fetchRecentChats} />)}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <Tabs defaultValue="recent" className="flex flex-col h-full">
                <header className="sticky top-16 md:top-0 bg-gray-900 border-b border-gray-700 p-3 z-10">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                        <TabsTrigger value="recent">Recent</TabsTrigger>
                        <TabsTrigger value="all">All Users</TabsTrigger>
                    </TabsList>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search chats or users..."
                            className="pl-10 bg-gray-800 border-gray-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <TabsContent value="recent" className="p-2">
                        {renderRecentChats()}
                    </TabsContent>
                    <TabsContent value="all" className="p-2">
                        {renderAllUsers()}
                    </TabsContent>
                </main>
            </Tabs>
        </div>
    );
}
