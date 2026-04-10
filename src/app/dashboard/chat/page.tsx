
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTION_ID_CHATS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { isYesterday, isToday, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Master Chat Dashboard.
 * Logic for "All" users and "Recent" conversations.
 */

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
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all group max-w-xl mx-auto">
            <Link href={`/dashboard/chat/${otherUserId}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-primary/5 shadow-sm">
                        <AvatarImage src={otherUser.avatar} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.$id) return;

        // Fetch Recent Chats
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
            setLoading(false);
        });

        // Fetch All Users Directory
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
        <div className="flex flex-col h-full bg-background font-body">
            <header className="p-4 pt-12 max-w-xl mx-auto w-full border-b bg-muted/5">
                <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 bg-muted/50 rounded-full border shadow-sm">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="font-black uppercase text-xs tracking-[0.3em] text-primary">Chat Center</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
                
                <Tabs defaultValue="recent" className="w-full">
                    <TabsList className="grid grid-cols-2 bg-muted/50 h-12 rounded-2xl p-1 mb-6 border">
                        <TabsTrigger value="recent" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">All</TabsTrigger>
                    </TabsList>

                    <TabsContent value="recent" className="m-0 space-y-1">
                        <div className="relative w-full mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input
                                placeholder="Search recent..."
                                className="pl-11 h-11 text-xs rounded-2xl bg-muted/50 border-none shadow-none font-bold"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {loading ? (
                            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary/30" /></div>
                        ) : filteredRecent.length > 0 ? (
                            filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUserProfile} />)
                        ) : (
                            <div className="text-center py-20 text-muted-foreground font-black text-[8px] uppercase tracking-[0.3em] opacity-30">No Recent Chats</div>
                        )}
                    </TabsContent>

                    <TabsContent value="all" className="m-0 space-y-1">
                        <div className="relative w-full mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input
                                placeholder="Search I-Pay users..."
                                className="pl-11 h-11 text-xs rounded-2xl bg-muted/50 border-none shadow-none font-bold"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1 pb-24">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <Link key={user.$id} href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all active:scale-[0.98]">
                                        <div className="relative">
                                            <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                                                <AvatarImage src={user.avatar} className="object-cover" />
                                                <AvatarFallback className="font-black bg-muted text-foreground/50">{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {user.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-black text-xs uppercase tracking-tight text-foreground/80">@{user.username}</p>
                                            <p className="text-[8px] font-bold uppercase text-primary/60">{user.isOnline ? 'Online Now' : 'Offline'}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-20 text-muted-foreground font-black text-[8px] uppercase tracking-[0.3em] opacity-30">No Users Found</div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </header>
        </div>
    );
}
