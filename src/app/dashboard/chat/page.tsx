'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Loader2, Video } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { isYesterday, isToday, format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Chat Center - Master High-Speed Edition.
 * LABELS: Recent, All (Standard Title Case).
 */

const safeDate = (ts: any) => {
    if (!ts) return null;
    try {
        if (ts?.toDate) return ts.toDate();
        if (ts?.toMillis) return new Date(ts.toMillis());
        if (ts?.seconds !== undefined) return new Date(ts.seconds * 1000);
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
};

const RecentChatItem = ({ chat, currentUser }: { chat: any, currentUser: any }) => {
    const { allUsers } = useUser();
    const currentUid = currentUser?.$id || currentUser?.uid;
    
    const otherUser = useMemo(() => {
        const otherId = chat.participants?.find((p: string) => p !== currentUid);
        return allUsers.find(u => u.$id === otherId);
    }, [chat, currentUid, allUsers]);

    const formatChatDate = (ts: any) => {
        const date = safeDate(ts);
        if (!date) return '';
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'dd/MM/yy');
    };

    if (!chat || !currentUid) return null;
    const unreadCount = chat.unreadCount?.[currentUid] || 0;

    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all group max-w-xl mx-auto">
            <Link href={otherUser ? `/dashboard/chat/${otherUser.$id}` : '#'} className="flex-1 flex items-center gap-3 overflow-hidden">
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-primary/5 shadow-sm">
                        <AvatarImage src={otherUser?.avatar} className="object-cover" />
                        <AvatarFallback className="font-black bg-primary text-white">{otherUser?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    {otherUser?.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                        <p className="font-bold text-xs">@{otherUser?.username || 'user'}</p>
                        <p className="text-[7px] font-black uppercase text-muted-foreground">{formatChatDate(chat.lastMessageAt)}</p>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        <p className={cn("text-[10px] truncate max-w-[80%]", unreadCount > 0 ? "font-bold text-foreground" : "text-muted-foreground")}>{chat.lastMessage || '...'}</p>
                        {unreadCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 p-0 px-1 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</Badge>}
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default function ChatPage() {
    const router = useRouter();
    const { user: currentUser, allUsers, recentChats, loading } = useUser();
    const [searchRecent, setSearchRecent] = useState('');
    const [searchAll, setSearchAll] = useState('');

    const filteredUsers = useMemo(() =>
        allUsers.filter(u => u.$id !== currentUser?.$id && (u.username || '').toLowerCase().includes(searchAll.toLowerCase())), 
        [allUsers, searchAll, currentUser?.$id]
    );

    const filteredRecent = useMemo(() =>
        recentChats.filter(c => (c.lastMessage || '').toLowerCase().includes(searchRecent.toLowerCase())), 
        [recentChats, searchRecent]
    );

    return (
        <div className="flex flex-col min-h-screen bg-background font-body">
            <header className="p-4 pt-12 max-w-xl mx-auto w-full border-b bg-muted/5">
                <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 bg-muted/50 rounded-full border shadow-sm"><ArrowLeft className="h-5 w-5" /></Button>
                    <h1 className="font-black uppercase text-sm tracking-[0.2em] text-primary">Chat Center</h1>
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 bg-primary/10 text-primary rounded-full"><Link href="/dashboard/meeting"><Video className="h-5 w-5" /></Link></Button>
                </div>
                
                <Tabs defaultValue="recent" className="w-full">
                    <TabsList className="grid grid-cols-2 bg-muted h-12 rounded-2xl p-1 mb-6 border">
                        <TabsTrigger value="recent" className="rounded-xl font-black uppercase text-[10px]">Recent</TabsTrigger>
                        <TabsTrigger value="all" className="rounded-xl font-black uppercase text-[10px]">All</TabsTrigger>
                    </TabsList>

                    <TabsContent value="recent" className="m-0 space-y-1">
                        <div className="relative w-full mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input placeholder="Search recent..." className="pl-11 h-11 text-xs rounded-2xl bg-muted/50 border-none font-bold" value={searchRecent} onChange={(e) => setSearchRecent(e.target.value)} />
                        </div>
                        {loading && filteredRecent.length === 0 ? (
                            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary/30" /></div>
                        ) : filteredRecent.length > 0 ? (
                            <div className="space-y-1">{filteredRecent.map(chat => <RecentChatItem key={chat.$id} chat={chat} currentUser={currentUser} />)}</div>
                        ) : <div className="text-center py-20 text-muted-foreground font-black text-[8px] uppercase tracking-widest opacity-30">No recent chats</div>}
                    </TabsContent>

                    <TabsContent value="all" className="m-0 space-y-1">
                        <div className="relative w-full mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input placeholder="Search users..." className="pl-11 h-11 text-xs rounded-2xl bg-muted/50 border-none font-bold" value={searchAll} onChange={(e) => setSearchAll(e.target.value)} />
                        </div>
                        <div className="grid gap-1">
                            {filteredUsers.map(u => (
                                <Link key={u.$id} href={`/dashboard/chat/${u.$id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all active:scale-[0.98]">
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm"><AvatarImage src={u.avatar} /><AvatarFallback className="font-black bg-muted">{u.username?.charAt(0) || '?'}</AvatarFallback></Avatar>
                                        {u.isOnline && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                                    </div>
                                    <div className="flex-1 overflow-hidden"><p className="font-bold text-xs tracking-tight">@{u.username}</p><p className="text-[8px] font-bold uppercase text-primary/60">{u.isOnline ? 'Online now' : 'Offline'}</p></div>
                                </Link>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </header>
            <footer className="mt-auto p-6 border-t bg-muted/5 flex flex-col items-center gap-4 pb-24"><p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-20">I-Pay Security Engine Active</p></footer>
        </div>
    );
}
