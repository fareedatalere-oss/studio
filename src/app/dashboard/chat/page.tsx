'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Video, CheckCheck } from 'lucide-react';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { COLLECTION_ID_CHATS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { formatDistanceToNow } from 'date-fns';

const RecentChatItem = ({ chat, currentUser }: { chat: any, currentUser: any }) => {
    const [otherUser, setOtherUser] = useState<any>(null);
    const otherUserId = chat.participants.find((p: string) => p !== currentUser.$id);

    useEffect(() => {
        if (!otherUserId) return;
        const fetchOther = async () => {
            const d = await getDoc(doc(db, COLLECTION_ID_PROFILES, otherUserId));
            if (d.exists()) setOtherUser(d.data());
        };
        fetchOther();
    }, [otherUserId]);

    if (!otherUser) return null;

    return (
        <Link href={`/dashboard/chat/${otherUserId}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border">
            <div className="relative">
                <Avatar className="h-12 w-12 shrink-0 border border-primary/10">
                    <AvatarImage src={otherUser.avatar} />
                    <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {otherUser.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                    <p className="font-bold text-sm truncate">@{otherUser.username}</p>
                    <p className="text-[8px] font-black uppercase text-muted-foreground opacity-60">
                        {chat.lastMessageAt && formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground truncate opacity-80">{chat.lastMessage}</p>
                </div>
            </div>
        </Link>
    );
};

export default function ChatPage() {
    const { user: currentUser } = useUser();
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!currentUser) return;

        // Sync Recent Chats
        const q = query(
            collection(db, COLLECTION_ID_CHATS),
            where('participants', 'array-contains', currentUser.$id),
            orderBy('lastMessageAt', 'desc')
        );

        const unsubChats = onSnapshot(q, (snapshot) => {
            setRecentChats(snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Sync All Users (Online First)
        const uQ = query(collection(db, COLLECTION_ID_PROFILES), limit(100));
        const unsubUsers = onSnapshot(uQ, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() })));
        });

        return () => { unsubChats(); unsubUsers(); };
    }, [currentUser]);

    const filteredUsers = useMemo(() =>
        allUsers.filter(u =>
            u.$id !== currentUser?.$id &&
            (u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
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
                <header className="sticky top-16 md:top-0 bg-white border-b p-3 z-10">
                    <TabsList className="grid w-full grid-cols-2 bg-muted text-gray-600 h-10 rounded-2xl p-1">
                        <TabsTrigger value="recent" className="text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Direct</TabsTrigger>
                    </TabsList>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Find conversations..."
                            className="pl-9 text-gray-900 h-10 text-xs rounded-2xl bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scrollbar-hide">
                    <TabsContent value="recent" className="p-2 m-0 space-y-1">
                        {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div> : 
                         filteredRecent.length > 0 ? filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUser} />) : 
                         <div className="text-center py-20 text-muted-foreground font-bold text-xs uppercase tracking-widest opacity-30">No chats found</div>}
                    </TabsContent>
                    <TabsContent value="all" className="p-2 m-0 space-y-1">
                        {filteredUsers.map(user => (
                            <Link key={user.$id} href={`/dashboard/chat/${user.$id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border">
                                <div className="relative">
                                    <Avatar className="h-10 w-10 border border-primary/5">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {user.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">@{user.username}</p>
                                    <p className="text-[9px] font-black uppercase text-primary/60">{user.isOnline ? 'Active Now' : 'Last seen recently'}</p>
                                </div>
                            </Link>
                        ))}
                    </TabsContent>
                </main>
            </Tabs>

            <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center z-50 pointer-events-none md:bottom-4">
                <Button asChild className="rounded-full h-12 px-6 shadow-2xl font-black uppercase tracking-widest gap-2 bg-primary pointer-events-auto active:scale-95 transition-transform">
                    <Link href="/dashboard/meeting"><Video className="h-4 w-4" /> Meetings</Link>
                </Button>
            </div>
        </div>
    );
}
