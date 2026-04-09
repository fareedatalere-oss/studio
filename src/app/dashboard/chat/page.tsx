'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Video, MoreVertical, Trash2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, limit } from 'firebase/firestore';
import { COLLECTION_ID_CHATS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RECENT_CACHE_KEY = 'ipay-recent-chats-v2';
const ALL_USERS_CACHE_KEY = 'ipay-all-users-v2';

const RecentChatItem = ({ chat, currentUser }: { chat: any, currentUser: any }) => {
    const [otherUser, setOtherUser] = useState<any>(null);
    const { toast } = useToast();
    const otherUserId = chat.participants.find((p: string) => p !== currentUser?.$id);

    useEffect(() => {
        if (!otherUserId) return;
        const fetchOther = async () => {
            const d = await getDoc(doc(db, COLLECTION_ID_PROFILES, otherUserId));
            if (d.exists()) setOtherUser(d.data());
        };
        fetchOther();
    }, [otherUserId]);

    const deleteChatHistory = async () => {
        try {
            await deleteDoc(doc(db, COLLECTION_ID_CHATS, chat.$id));
            toast({ title: 'Chat History Deleted' });
        } catch (e) {}
    };

    const toggleBlock = async () => {
        if (!currentUser) return;
        const currentlyBlocked = currentUser.blockedUsers?.includes(otherUserId);
        try {
            await updateDoc(doc(db, COLLECTION_ID_PROFILES, currentUser.$id), {
                blockedUsers: currentlyBlocked ? arrayRemove(otherUserId) : arrayUnion(otherUserId)
            });
            toast({ title: currentlyBlocked ? 'Unblocked' : 'Blocked' });
        } catch (e) {}
    };

    if (!otherUser) return null;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border group">
            <Link href={`/dashboard/chat/${otherUserId}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                <div className="relative">
                    <Avatar className="h-11 w-11 shrink-0 border border-primary/10">
                        <AvatarImage src={otherUser.avatar} />
                        <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {otherUser.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                        <p className="font-bold text-xs truncate">@{otherUser.username}</p>
                        <p className="text-[7px] font-black uppercase text-muted-foreground opacity-60">
                            {chat.lastMessageAt?.toDate ? formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true }) : 'just now'}
                        </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate opacity-80">{chat.lastMessage}</p>
                </div>
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 font-bold uppercase text-[9px]">
                    <DropdownMenuItem onClick={deleteChatHistory} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Chat</DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleBlock}>
                        {currentUser?.blockedUsers?.includes(otherUserId) ? <><ShieldCheck className="mr-2 h-3.5 w-3.5" /> Unblock</> : <><ShieldAlert className="mr-2 h-3.5 w-3.5" /> Block User</>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default function ChatPage() {
    const { user: currentUser, profile: currentUserProfile } = useUser();
    
    // INSTANT LOADING CACHE LOGIC
    const [recentChats, setRecentChats] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(RECENT_CACHE_KEY);
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [allUsers, setAllUsers] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(ALL_USERS_CACHE_KEY);
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!currentUser?.$id) return;

        // REAL-TIME RECENT CHATS
        const q = query(
            collection(db, COLLECTION_ID_CHATS),
            where('participants', 'array-contains', currentUser.$id),
            orderBy('lastMessageAt', 'desc'),
            limit(50)
        );

        const unsubChats = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            setRecentChats(data);
            localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(data));
        });

        // REAL-TIME ALL USERS
        const uQ = query(collection(db, COLLECTION_ID_PROFILES), limit(100));
        const unsubUsers = onSnapshot(uQ, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            setAllUsers(data);
            localStorage.setItem(ALL_USERS_CACHE_KEY, JSON.stringify(data));
        });

        return () => { unsubChats(); unsubUsers(); };
    }, [currentUser]);

    const filteredUsers = useMemo(() =>
        allUsers.filter(u =>
            u.$id !== currentUser?.$id &&
            (u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
        ).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)), 
        [allUsers, searchQuery, currentUser]
    );

    const filteredRecent = useMemo(() =>
        recentChats.filter(c =>
            c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
        ), [recentChats, searchQuery]
    );

    return (
        <div className="flex flex-col h-full bg-white text-gray-900 relative">
            <Tabs defaultValue="recent" className="flex flex-col h-full">
                <header className="sticky top-0 bg-white border-b p-3 z-10">
                    <TabsList className="grid w-full grid-cols-2 bg-muted h-10 rounded-2xl p-1">
                        <TabsTrigger value="recent" className="text-[10px] font-black tracking-widest rounded-xl data-[state=active]:bg-white">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] font-black tracking-widest rounded-xl data-[state=active]:bg-white">All</TabsTrigger>
                    </TabsList>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Find conversations..."
                            className="pl-9 text-gray-900 h-10 text-xs rounded-2xl bg-muted/50 border-none shadow-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scrollbar-hide">
                    <TabsContent value="recent" className="p-2 m-0 space-y-1">
                        {filteredRecent.length > 0 ? (
                            filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUserProfile} />)
                        ) : loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : (
                            <div className="text-center py-20 text-muted-foreground font-bold text-[10px] uppercase tracking-widest opacity-30">No chats found</div>
                        )}
                    </TabsContent>
                    <TabsContent value="all" className="p-2 m-0 space-y-1">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <Link key={user.$id} href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border">
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border border-primary/5">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {user.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-xs">@{user.username}</p>
                                        <p className="text-[8px] font-black uppercase text-primary/60">{user.isOnline ? 'Online' : 'Offline'}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-20 text-muted-foreground font-bold text-[10px] uppercase tracking-widest opacity-30">No users found</div>
                        )}
                    </TabsContent>
                </main>
            </Tabs>

            <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center z-50">
                <Button asChild className="rounded-full h-12 px-6 shadow-2xl font-black gap-2 bg-primary">
                    <Link href="/dashboard/meeting"><Video className="h-4 w-4" /> Meeting</Link>
                </Button>
            </div>
        </div>
    );
}
