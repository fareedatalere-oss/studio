'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import client, { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, storage, BUCKET_ID_UPLOADS, ID, Query } from '@/lib/appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, Trash2, Play, Pause, Forward, Check, CheckCheck, Copy, ShieldAlert, UserX, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0].substring(0, 15)}_${sortedIds[1].substring(0, 15)}`;
};

const MessageStatus = ({ status, isMine }: { status: string, isMine: boolean }) => {
    if (!isMine) return null;
    switch (status) {
        case 'sent': return <Check className="h-2.5 w-2.5 text-muted-foreground/50" />;
        case 'delivered': return <CheckCheck className="h-2.5 w-2.5 text-muted-foreground/50" />;
        case 'read': return <CheckCheck className="h-2.5 w-2.5 text-green-500" />;
        default: return <Check className="h-2.5 w-2.5 text-muted-foreground/30" />;
    }
};

export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, profile: currentUserProfile, recheckUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isForwarding, setIsForwarding] = useState(false);
    const [msgToForward, setMsgToForward] = useState<any>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;

    const isBlocked = currentUserProfile?.blockedUsers?.includes(otherUserId) || otherUser?.blockedUsers?.includes(currentUser?.$id);

    useEffect(() => {
        if (!chatId || chatId === 'invalid_chat' || !currentUser) return;

        const q = query(
            collection(db, COLLECTION_ID_MESSAGES),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }))
                .filter((m: any) => !m.deletedForEveryone && !(m.deletedFor || []).includes(currentUser.$id));
            setMessages(msgs);

            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.senderId !== currentUser.$id && data.status !== 'read') {
                    updateDoc(doc(db, COLLECTION_ID_MESSAGES, d.id), { status: 'read' });
                }
            });
        });

        const fetchOther = async () => {
            const d = await getDoc(doc(db, COLLECTION_ID_PROFILES, otherUserId));
            if (d.exists()) setOtherUser(d.data());
        };
        fetchOther();

        // Fetch recent chats for forwarding
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
            Query.equal('participants', currentUser.$id),
            Query.limit(20)
        ]).then(res => setRecentChats(res.documents));

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (text: string, targetChatId?: string, targetOtherId?: string) => {
        const finalChatId = targetChatId || chatId;
        const finalOtherId = targetOtherId || otherUserId;
        if (!text.trim() || !currentUser || !finalChatId || finalChatId === 'invalid_chat') return;
        
        try {
            const status = 'sent';
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), { 
                chatId: finalChatId, 
                senderId: currentUser.$id, 
                text: text.trim(), 
                status 
            });
            const chatData = { participants: [currentUser.$id, finalOtherId], lastMessage: text.trim(), lastMessageAt: serverTimestamp() };
            try { await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, finalChatId, chatData); } 
            catch (e: any) { if (e.code === 404) await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, finalChatId, chatData); }
        } catch (e) {}
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied to Clipboard' });
    };

    const handleForward = async (targetUserId: string) => {
        if (!msgToForward) return;
        const targetChatId = getChatId(currentUser?.$id, targetUserId);
        if (targetChatId && targetChatId !== 'invalid_chat') {
            await handleSend(msgToForward.text, targetChatId, targetUserId);
            toast({ title: 'Message Forwarded' });
            setIsForwarding(false);
            setMsgToForward(null);
        }
    };

    const deleteMessage = async (msgId: string, forEveryone: boolean) => {
        try {
            if (forEveryone) {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { deletedForEveryone: true });
            } else {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { deletedFor: arrayUnion(currentUser?.$id) });
            }
            toast({ title: 'Message Deleted' });
        } catch (e) {}
    };

    const toggleBlock = async () => {
        if (!currentUser || !otherUserId) return;
        const currentlyBlocked = currentUserProfile?.blockedUsers?.includes(otherUserId);
        try {
            await updateDoc(doc(db, COLLECTION_ID_PROFILES, currentUser.$id), {
                blockedUsers: currentlyBlocked ? arrayRemove(otherUserId) : arrayUnion(otherUserId)
            });
            await recheckUser();
            toast({ title: currentlyBlocked ? 'User Unblocked' : 'User Blocked' });
        } catch (e) {}
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="sticky top-0 bg-white border-b flex items-center p-3 gap-3 z-10 shadow-sm h-14">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-2">
                        <Avatar className="h-9 w-9 border border-primary/10">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-bold text-xs leading-none">@{otherUser.username}</h2>
                            {otherUser.isOnline && <p className="text-[8px] font-black uppercase text-green-500 mt-1">Online</p>}
                        </div>
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={toggleBlock} className={cn("font-bold text-xs uppercase", isBlocked ? "text-green-600" : "text-destructive")}>
                            {currentUserProfile?.blockedUsers?.includes(otherUserId) ? <><UserCheck className="mr-2 h-3.5 w-3.5" /> Unblock</> : <><ShieldAlert className="mr-2 h-3.5 w-3.5" /> Block User</>}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50 scrollbar-hide">
                {messages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.$id;
                    return (
                        <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                            <div className="flex items-center gap-1 group">
                                <div className={cn("p-2.5 rounded-2xl shadow-sm relative", isMine ? "bg-primary text-white rounded-br-none" : "bg-white border rounded-bl-none")}>
                                    <p className="text-xs font-medium whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                        <span className="text-[7px] font-mono">{msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}</span>
                                        <MessageStatus status={msg.status} isMine={isMine} />
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"><MoreVertical className="h-3 w-3" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isMine ? "end" : "start"} className="w-32 font-bold uppercase text-[9px]">
                                        <DropdownMenuItem onClick={() => handleCopy(msg.text)}><Copy className="mr-2 h-3 w-3" /> Copy</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setMsgToForward(msg); setIsForwarding(true); }}><Forward className="mr-2 h-3 w-3" /> Forward</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteMessage(msg.$id, false)} className="text-destructive"><Trash2 className="mr-2 h-3 w-3" /> Delete For Me</DropdownMenuItem>
                                        {isMine && <DropdownMenuItem onClick={() => deleteMessage(msg.$id, true)} className="text-destructive font-black">Delete For Both</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-2 border-t bg-white">
                {isBlocked ? (
                    <div className="bg-muted/50 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Messages Restricted</p>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(newMessage); setNewMessage(''); }} className="flex items-center gap-2">
                        <Input 
                            placeholder="Write message..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            className="h-10 rounded-full bg-muted/50 border-none px-4 text-xs font-bold" 
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()} className="h-10 w-10 rounded-full shadow-lg"><Send className="h-4 w-4" /></Button>
                    </form>
                )}
            </footer>

            <Dialog open={isForwarding} onOpenChange={setIsForwarding}>
                <DialogContent className="max-w-sm rounded-[2rem] p-6">
                    <DialogHeader><DialogTitle className="text-center font-black uppercase text-xs tracking-widest">Forward To</DialogTitle></DialogHeader>
                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                        {recentChats.map(chat => {
                            const targetId = chat.participants.find((p: string) => p !== currentUser?.$id);
                            return (
                                <Button key={chat.$id} variant="outline" className="w-full justify-start h-12 rounded-xl gap-3" onClick={() => handleForward(targetId)}>
                                    <p className="font-bold text-xs">@{targetId.substring(0, 10)}...</p>
                                </Button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
