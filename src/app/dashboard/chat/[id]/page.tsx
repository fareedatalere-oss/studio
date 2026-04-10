
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    serverTimestamp, setDoc, updateDoc, deleteDoc, 
    getDoc, writeBatch, getDocs, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS } from '@/lib/appwrite';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, Mic, MoreVertical, UserX, Trash2, Forward, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, profile: myProfile, recheckUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isForwarding, setIsForwarding] = useState<string | null>(null);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [selectedForForward, setSelectedForForward] = useState<string[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageMapRef = useRef<Map<string, any>>(new Map());
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    const isBlocked = myProfile?.blockedUsers?.includes(otherUserId);
    const hasBlockedMe = otherUser?.blockedUsers?.includes(currentUser?.$id);

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                const id = change.doc.id;
                
                if (data.deletedFor?.includes(currentUser.$id)) {
                    messageMapRef.current.delete(id);
                } else if (change.type === 'removed') {
                    messageMapRef.current.delete(id);
                } else {
                    messageMapRef.current.set(id, { $id: id, ...data });
                }
            });

            const sorted = Array.from(messageMapRef.current.values()).sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
                const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
                return timeA - timeB;
            });
            
            setMessages(sorted);

            // Mark as read logic
            const unread = snapshot.docs.filter(d => d.data().senderId !== currentUser.$id && d.data().status !== 'read');
            if (unread.length > 0) {
                const batch = writeBatch(db);
                unread.forEach(d => batch.update(d.ref, { status: 'read' }));
                batch.commit();
            }
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => {
        if (currentUser?.$id) {
            const q = query(collection(db, COLLECTION_ID_CHATS), where('participants', 'array-contains', currentUser.$id));
            const unsub = onSnapshot(q, (snap) => {
                setRecentChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [currentUser]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string) => {
        const text = textOverride || newMessage.trim();
        if (!text || !currentUser || !chatId || isBlocked || hasBlockedMe) return;
        
        if (!textOverride) setNewMessage('');

        const msgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
        const initialStatus = otherUser?.isOnline ? 'delivered' : 'sent';

        try {
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId, 
                senderId: currentUser.$id, 
                text: text, 
                status: initialStatus,
                deletedFor: [],
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: text.length > 30 ? text.substring(0,30)+'...' : text,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        }
    };

    const deleteMessage = async (msgId: string, forAll: boolean) => {
        try {
            if (forAll) {
                await deleteDoc(doc(db, COLLECTION_ID_MESSAGES, msgId));
            } else {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), {
                    deletedFor: arrayUnion(currentUser?.$id)
                });
                messageMapRef.current.delete(msgId);
                setMessages(prev => prev.filter(m => m.$id !== msgId));
            }
            toast({ title: 'Message Deleted' });
        } catch (e) {}
    };

    const handleBlock = async () => {
        if (!currentUser) return;
        try {
            const myRef = doc(db, COLLECTION_ID_PROFILES, currentUser.$id);
            if (isBlocked) {
                await updateDoc(myRef, { blockedUsers: arrayRemove(otherUserId) });
                toast({ title: 'User Unblocked' });
            } else {
                await updateDoc(myRef, { blockedUsers: arrayUnion(otherUserId) });
                toast({ title: 'User Blocked' });
            }
            await recheckUser();
        } catch (e) {}
    };

    const deleteChatHistory = async () => {
        try {
            const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.update(d.ref, { deletedFor: arrayUnion(currentUser?.$id) }));
            await batch.commit();
            messageMapRef.current.clear();
            setMessages([]);
            toast({ title: 'History Cleared' });
        } catch (e) {}
    };

    const handleForward = async () => {
        if (!isForwarding || selectedForForward.length === 0) return;
        const msg = messages.find(m => m.$id === isForwarding);
        if (!msg) return;

        toast({ title: `Forwarding to ${selectedForForward.length} users...` });
        for (const targetId of selectedForForward) {
            const fwdChatId = getChatId(currentUser?.$id, targetId);
            const fwdMsgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, fwdMsgId), {
                chatId: fwdChatId,
                senderId: currentUser?.$id,
                text: `[Forwarded]: ${msg.text}`,
                status: 'sent',
                deletedFor: [],
                createdAt: serverTimestamp()
            });
        }
        setIsForwarding(null);
        setSelectedForForward([]);
        toast({ title: 'Message Forwarded' });
    };

    const getTickIcon = (status: string) => {
        switch (status) {
            case 'read': return <div className="flex gap-[-2px]"><Check className="h-2 w-2 text-green-400" /><Check className="h-2 w-2 text-green-400 -ml-1" /></div>;
            case 'delivered': return <div className="flex gap-[-2px]"><Check className="h-2 w-2 text-muted-foreground" /><Check className="h-2 w-2 text-muted-foreground -ml-1" /></div>;
            default: return <Check className="h-2 w-2 text-muted-foreground" />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-3 z-50 pt-12 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-10 w-10 rounded-full bg-muted/50">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <Avatar className="h-11 w-11 border-2 border-primary/10 shadow-sm">
                            <AvatarImage src={otherUser.avatar} className="object-cover" />
                            <AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <h2 className="font-black text-xs leading-none truncate uppercase tracking-tighter">@{otherUser.username}</h2>
                            <p className={cn("text-[8px] font-black uppercase mt-1.5", otherUser.isOnline ? "text-green-500 animate-pulse" : "text-muted-foreground")}>
                                {otherUser.isOnline ? 'Online Now' : otherUser.lastSeen ? `Left ${formatDistanceToNow(new Date(otherUser.lastSeen.toMillis ? otherUser.lastSeen.toMillis() : otherUser.lastSeen), { addSuffix: true })}` : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><MoreVertical className="h-5 w-5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-black uppercase text-[10px]">
                        <DropdownMenuItem onClick={handleBlock} className={isBlocked ? "text-green-600" : "text-destructive"}>
                            <UserX className="mr-2 h-4 w-4" /> {isBlocked ? 'Unblock User' : 'Block User'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={deleteChatHistory} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Clear History
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain bg-muted/5">
                <div className="max-w-xl mx-auto w-full space-y-3">
                    <div className="text-center py-6 opacity-20 flex flex-col items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <p className="text-[7px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p>
                    </div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className={cn(
                                            "p-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold leading-relaxed cursor-pointer active:scale-95 transition-transform", 
                                            isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border"
                                        )}>
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                <span className="text-[6px] font-black uppercase">
                                                    {msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : '...'}
                                                </span>
                                                {isMine && getTickIcon(msg.status)}
                                            </div>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-40 font-black uppercase text-[9px]">
                                        <DropdownMenuItem onClick={() => setIsForwarding(msg.$id)}>
                                            <Forward className="mr-2 h-3.5 w-3.5" /> Forward
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteMessage(msg.$id, false)}>
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me
                                        </DropdownMenuItem>
                                        {isMine && (
                                            <DropdownMenuItem onClick={() => deleteMessage(msg.$id, true)} className="text-destructive">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for all
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {(isBlocked || hasBlockedMe) ? (
                <footer className="p-10 border-t bg-destructive/5 text-center">
                    <p className="text-[10px] font-black uppercase text-destructive tracking-widest">
                        {isBlocked ? 'You have blocked this user' : 'This user has blocked you'}
                    </p>
                </footer>
            ) : (
                <footer className="p-4 border-t bg-background safe-area-bottom pb-8">
                    <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted">
                            <Paperclip className="h-5 w-5" />
                        </Button>
                        <Input 
                            placeholder="Type text only..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }}
                            className="flex-1 h-12 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" 
                        />
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted">
                                <Mic className="h-5 w-5" />
                            </Button>
                            <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim()} className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">
                                <Send className="h-5 w-5 text-white" />
                            </Button>
                        </div>
                    </div>
                </footer>
            )}

            <Dialog open={!!isForwarding} onOpenChange={(o) => !o && setIsForwarding(null)}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none bg-background">
                    <DialogHeader><DialogTitle className="text-center font-black uppercase tracking-tighter">Forward Message</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-center">Select up to 10 users</p>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {recentChats.map(chat => {
                                const id = chat.participants.find((p: string) => p !== currentUser?.$id);
                                return (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => {
                                            if (selectedForForward.includes(id)) setSelectedForForward(prev => prev.filter(i => i !== id));
                                            else if (selectedForForward.length < 10) setSelectedForForward(prev => [...prev, id]);
                                        }}
                                        className={cn("flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all", selectedForForward.includes(id) ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}
                                    >
                                        <p className="font-bold text-xs">Chat ID: {id.substring(0, 8)}...</p>
                                        {selectedForForward.includes(id) && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                );
                            })}
                        </div>
                        <Button className="w-full h-12 rounded-full font-black uppercase text-[10px]" onClick={handleForward} disabled={selectedForForward.length === 0}>
                            Send Forward ({selectedForForward.length})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
