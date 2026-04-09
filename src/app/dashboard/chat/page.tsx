
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Video, MoreVertical, Trash2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, limit } from 'firebase/firestore';
import { COLLECTION_ID_CHATS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { formatDistanceToNow, isYesterday, isToday, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RECENT_CACHE_KEY = 'ipay-recent-chats-v3';
const ALL_USERS_CACHE_KEY = 'ipay-all-users-v3';

const RecentChatItem = ({ chat, currentUser }: { chat: any, currentUser: any }) => {
    const [otherUser, setOtherUser] = useState<any>(null);
    const { toast } = useToast();
    const otherUserId = chat.participants?.find((p: string) => p !== currentUser?.uid);
    const unreadCount = chat.unreadCount?.[currentUser?.uid] || 0;

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
            toast({ title: 'Chat Deleted' });
        } catch (e) {}
    };

    const formatChatDate = (date: Date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'dd/MM/yy');
    };

    if (!otherUser) return null;

    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all group">
            <Link href={`/dashboard/chat/${otherUserId}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-primary/5">
                        <AvatarImage src={otherUser.avatar} />
                        <AvatarFallback className="font-black">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {otherUser.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                        <p className="font-bold text-xs">@{otherUser.username}</p>
                        <p className="text-[7px] font-black uppercase text-muted-foreground">
                            {chat.lastMessageAt?.toDate ? formatChatDate(chat.lastMessageAt.toDate()) : ''}
                        </p>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        <p className={cn("text-[10px] truncate max-w-[80%]", unreadCount > 0 ? "font-black text-foreground" : "text-muted-foreground font-medium")}>
                            {chat.lastMessage}
                        </p>
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-4 p-0 px-1 text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center">
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                </div>
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-30 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 font-black uppercase text-[9px]">
                    <DropdownMenuItem onClick={deleteChatHistory} className="text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Chat
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default function ChatPage() {
    const { user: currentUser, profile: currentUserProfile } = useUser();
    
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

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!currentUser?.$id) return;

        const q = query(
            collection(db, COLLECTION_ID_CHATS),
            where('participants', 'array-contains', currentUser.$id)
        );

        const unsubChats = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            
            data.sort((a: any, b: any) => {
                const timeA = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : 0;
                const timeB = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            setRecentChats(data);
            localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(data));
        });

        const unsubUsers = onSnapshot(collection(db, COLLECTION_ID_PROFILES), (snapshot) => {
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
        <div className="flex flex-col h-full bg-background text-foreground relative">
            <Tabs defaultValue="recent" className="flex flex-col h-full">
                <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b p-3 z-10">
                    <TabsList className="grid w-full grid-cols-2 bg-muted h-10 rounded-2xl p-1">
                        <TabsTrigger value="recent" className="text-[10px] font-black tracking-widest rounded-xl data-[state=active]:bg-background">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] font-black tracking-widest rounded-xl data-[state=active]:bg-background">All</TabsTrigger>
                    </TabsList>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Find conversations..."
                            className="pl-9 h-10 text-[11px] rounded-2xl bg-muted/50 border-none shadow-none font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scrollbar-hide">
                    <TabsContent value="recent" className="p-2 m-0 space-y-1">
                        {filteredRecent.length > 0 ? (
                            filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUserProfile} />)
                        ) : (
                            <div className="text-center py-20 text-muted-foreground font-black text-[9px] uppercase tracking-[0.3em] opacity-30">No Recent Chats</div>
                        )}
                    </TabsContent>
                    <TabsContent value="all" className="p-2 m-0 space-y-1">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <Link key={user.$id} href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all">
                                    <div className="relative">
                                        <Avatar className="h-11 w-11 border-2 border-primary/5">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="font-black">{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
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
                            <div className="text-center py-20 text-muted-foreground font-black text-[9px] uppercase tracking-[0.3em] opacity-30">No Users Found</div>
                        )}
                    </TabsContent>
                </main>
            </Tabs>

            <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center z-50">
                <Button asChild className="rounded-full h-12 px-8 shadow-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-primary">
                    <Link href="/dashboard/meeting"><Video className="h-4 w-4" /> Meeting</Link>
                </Button>
            </div>
        </div>
    );
}
