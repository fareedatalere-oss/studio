'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Video, MoreVertical, Trash2, ArrowLeft } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTION_ID_CHATS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { isYesterday, isToday, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RECENT_CACHE_KEY = 'ipay-recent-chats-v8';
const ALL_USERS_CACHE_KEY = 'ipay-all-users-v8';

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
                            {chat.lastMessageAt?.toMillis ? formatChatDate(new Date(chat.lastMessageAt.toMillis())) : ''}
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
    const router = useRouter();
    const { user: currentUser, profile: currentUserProfile } = useUser();
    
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
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
                const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
                const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
                return timeB - timeA;
            });
            setRecentChats(data);
        });

        const unsubUsers = onSnapshot(collection(db, COLLECTION_ID_PROFILES), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            setAllUsers(data);
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
        <div className="flex flex-col h-full bg-background text-foreground relative font-body overflow-y-auto pb-safe">
            <header className="p-4 pt-12 max-w-xl mx-auto w-full">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="mb-4 h-10 w-10 bg-muted/50 rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <Tabs defaultValue="recent" className="flex flex-col w-full">
                    <TabsList className="flex items-center gap-2 bg-transparent h-12 p-0 border-none mb-4 justify-start">
                        <TabsTrigger value="recent" className="text-base font-black data-[state=active]:text-primary data-[state=active]:bg-transparent px-2 border-none shadow-none">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="text-base font-black data-[state=active]:text-primary data-[state=active]:bg-transparent px-2 border-none shadow-none">All</TabsTrigger>
                    </TabsList>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Find conversations..."
                            className="pl-11 h-12 text-sm rounded-full bg-muted/50 border-none shadow-none font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <main className="flex-1 pb-24">
                        <TabsContent value="recent" className="m-0 space-y-1">
                            {filteredRecent.length > 0 ? (
                                filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUserProfile} />)
                            ) : (
                                <div className="text-center py-20 text-muted-foreground font-black text-[9px] uppercase tracking-[0.3em] opacity-30">No Recent Chats</div>
                            )}
                        </TabsContent>
                        <TabsContent value="all" className="m-0 space-y-1">
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
            </header>

            <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50">
                <Button asChild className="rounded-full h-12 px-10 shadow-2xl font-black text-[10px] tracking-[0.2em] uppercase gap-2 bg-primary">
                    <Link href="/dashboard/meeting"><Video className="h-4 w-4" /> Meeting</Link>
                </Button>
            </div>
        </div>
    );
}
