
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, Trash2, ArrowLeft, Loader2, Video } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { COLLECTION_ID_CHATS, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES } from '@/lib/data-service';
import { isYesterday, isToday, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Chat Center Page.
 * HARDENED: Robust null-guards for profile access and search filtering to prevent client-side exception.
 */

const RecentChatItem = ({ chat, currentUser }: { chat: any, currentUser: any }) => {
    const [otherUser, setOtherUser] = useState<any>(null);
    const { toast } = useToast();
    
    const currentUid = currentUser?.$id || currentUser?.uid;
    
    useEffect(() => {
        if (!currentUid || !chat?.participants || !Array.isArray(chat.participants)) return;
        const otherId = chat.participants.find((p: string) => p !== currentUid);
        if (!otherId) return;

        const fetchOther = async () => {
            try {
                const d = await getDoc(doc(db, COLLECTION_ID_PROFILES, otherId));
                if (d.exists()) setOtherUser({ ...d.data(), $id: d.id });
            } catch (e) { console.error("Participant fetch fail", e); }
        };
        fetchOther();
    }, [chat, currentUid]);

    const unreadCount = currentUid ? (chat.unreadCount?.[currentUid] || 0) : 0;

    const deleteChatHistory = async () => {
        try {
            const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chat.$id));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            await deleteDoc(doc(db, COLLECTION_ID_CHATS, chat.$id));
            toast({ title: 'Chat Cleared' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete chat.' });
        }
    };

    const formatChatDate = (date: Date) => {
        try {
            if (!date) return '';
            if (isToday(date)) return format(date, 'HH:mm');
            if (isYesterday(date)) return 'Yesterday';
            return format(date, 'dd/MM/yy');
        } catch (e) { return ''; }
    };

    if (!otherUser || !currentUid) return null;

    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all group max-w-xl mx-auto">
            <Link href={`/dashboard/chat/${otherUser.$id}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-primary/5 shadow-sm">
                        <AvatarImage src={otherUser.avatar} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    {otherUser.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                        <p className="font-bold text-xs">@{otherUser.username || 'user'}</p>
                        <p className="text-[7px] font-black uppercase text-muted-foreground">
                            {chat.lastMessageAt?.toMillis ? formatChatDate(new Date(chat.lastMessageAt.toMillis())) : ''}
                        </p>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        <p className={cn("text-[10px] truncate max-w-[80%]", unreadCount > 0 ? "font-bold text-foreground" : "text-muted-foreground font-medium")}>
                            {chat.lastMessage || 'No messages yet'}
                        </p>
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 p-0 px-1 text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in-50">
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
                <DropdownMenuContent align="end" className="w-48 font-black uppercase text-[9px]">
                    <DropdownMenuItem onClick={deleteChatHistory} className="text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Chat History
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default function ChatPage() {
    const router = useRouter();
    const { user: currentUser, loading: userLoading } = useUser();
    
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchRecent, setSearchRecent] = useState('');
    const [searchAll, setSearchAll] = useState('');
    const [loading, setLoading] = useState(true);

    const currentUid = currentUser?.$id || currentUser?.uid;

    useEffect(() => {
        if (!currentUid) return;

        const q = query(collection(db, COLLECTION_ID_CHATS), where('participants', 'array-contains', currentUid));
        const unsubChats = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            data.sort((a: any, b: any) => {
                const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
                const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
                return timeB - timeA;
            });
            setRecentChats(data);
            setLoading(false);
        }, () => setLoading(false));

        const unsubUsers = onSnapshot(collection(db, COLLECTION_ID_PROFILES), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            setAllUsers(data);
        });

        return () => { unsubChats(); unsubUsers(); };
    }, [currentUid]);

    const filteredUsers = useMemo(() =>
        allUsers.filter(u =>
            u && u.$id !== currentUid &&
            (u.username?.toLowerCase() || '').includes(searchAll.toLowerCase())
        ).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)), 
        [allUsers, searchAll, currentUid]
    );

    const filteredRecent = useMemo(() =>
        recentChats.filter(c =>
            c && (c.lastMessage?.toLowerCase() || '').includes(searchRecent.toLowerCase())
        ), [recentChats, searchRecent]
    );

    if (userLoading || (!currentUid && loading)) {
        return (
            <div className="flex flex-col min-h-screen bg-background items-center justify-center">
                <Loader2 className="animate-spin h-10 w-10 text-primary/30" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Hub...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background font-body">
            <header className="p-4 pt-12 max-w-xl mx-auto w-full border-b bg-muted/5">
                <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 bg-muted/50 rounded-full border shadow-sm"><ArrowLeft className="h-5 w-5" /></Button>
                    <h1 className="font-black uppercase text-xs tracking-[0.3em] text-primary">Chat Center</h1>
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 bg-primary/10 text-primary rounded-full shadow-inner">
                        <Link href="/dashboard/meeting" title="Meeting Hub"><Video className="h-5 w-5" /></Link>
                    </Button>
                </div>
                
                <Tabs defaultValue="recent" className="w-full">
                    <TabsList className="grid grid-cols-2 bg-muted/50 h-12 rounded-2xl p-1 mb-6 border">
                        <TabsTrigger value="recent" className="rounded-xl font-black uppercase text-[10px] tracking-widest">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="rounded-xl font-black uppercase text-[10px] tracking-widest">All</TabsTrigger>
                    </TabsList>

                    <TabsContent value="recent" className="m-0 space-y-1">
                        <div className="relative w-full mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input placeholder="Search recent..." className="pl-11 h-11 text-xs rounded-2xl bg-muted/50 border-none shadow-none font-bold" value={searchRecent} onChange={(e) => setSearchRecent(e.target.value)} />
                        </div>
                        {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary/30" /></div> : filteredRecent.length > 0 ? (
                            <div className="space-y-1">{filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUser} />)}</div>
                        ) : <div className="text-center py-20 text-muted-foreground font-black text-[8px] uppercase tracking-[0.3em] opacity-30">No Recent Chats</div>}
                    </TabsContent>

                    <TabsContent value="all" className="m-0 space-y-1">
                        <div className="relative w-full mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input placeholder="Search users..." className="pl-11 h-11 text-xs rounded-2xl bg-muted/50 border-none shadow-none font-bold" value={searchAll} onChange={(e) => setSearchAll(e.target.value)} />
                        </div>
                        <div className="grid gap-1">
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <Link key={u.$id} href={`/dashboard/chat/${u.$id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all active:scale-[0.98]">
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm"><AvatarImage src={u.avatar} className="object-cover" /><AvatarFallback className="font-black bg-muted text-foreground/50">{u.username?.charAt(0) || '?'}</AvatarFallback></Avatar>
                                        {u.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                                    </div>
                                    <div className="flex-1 overflow-hidden"><p className="font-bold text-xs tracking-tight text-foreground/80">@{u.username || 'user'}</p><p className="text-[8px] font-bold uppercase text-primary/60">{u.isOnline ? 'Online Now' : 'Offline'}</p></div>
                                </Link>
                            )) : <div className="text-center py-20 text-muted-foreground font-black text-[8px] uppercase tracking-[0.3em] opacity-30">No Users Found</div>}
                        </div>
                    </TabsContent>
                </Tabs>
            </header>
            <footer className="mt-auto p-6 border-t bg-muted/5 flex flex-col items-center gap-4 pb-24"><p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-20">I-Pay Communication Hub</p></footer>
        </div>
    );
}
