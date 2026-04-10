
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, ID } from '@/lib/appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Send, ShieldCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
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
    const { user: currentUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageMapRef = useRef<Map<string, any>>(new Map());
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    // REAL-TIME LISTENER WITH DELTA RECONCILIATION
    useEffect(() => {
        if (!chatId || chatId === 'invalid_chat' || !currentUser) return;

        // Fetch other user profile
        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        // Delta Syncing: Removed orderBy to fix Firestore Index Error
        const q = query(
            collection(db, COLLECTION_ID_MESSAGES),
            where('chatId', '==', chatId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                const id = change.doc.id;
                
                if (change.type === 'removed') {
                    messageMapRef.current.delete(id);
                } else {
                    // Reconcile: If we have a temp optimistic message, replace it with server data
                    if (data.tempId && messageMapRef.current.has(data.tempId)) {
                        messageMapRef.current.delete(data.tempId);
                    }
                    messageMapRef.current.set(id, { $id: id, ...data });
                }
            });

            // Re-render: Convert Map to Sorted Array (Client-Side Sorting)
            const sorted = Array.from(messageMapRef.current.values()).sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
                const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
                return timeA - timeB;
            });
            
            setMessages(sorted);
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages]);

    const handleSend = async (text: string) => {
        if (!text.trim() || !currentUser || !chatId) return;
        
        const tempId = `temp-${Date.now()}`;
        const messageText = text.trim();
        setNewMessage('');

        // 1. Optimistic UI: Add to map immediately
        const optimisticMsg = {
            $id: tempId,
            chatId,
            senderId: currentUser.$id,
            text: messageText,
            status: 'sent',
            createdAt: new Date(),
            isOptimistic: true
        };
        
        messageMapRef.current.set(tempId, optimisticMsg);
        setMessages(Array.from(messageMapRef.current.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));

        try {
            const msgId = ID.unique();
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId, 
                senderId: currentUser.$id, 
                text: messageText, 
                tempId: tempId,
                status: 'sent',
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: messageText.length > 30 ? messageText.substring(0,30)+'...' : messageText,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (e: any) {
            messageMapRef.current.delete(tempId);
            toast({ variant: 'destructive', title: 'Error', description: 'Message failed to send.' });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-2 z-50 pt-12">
                <div className="flex items-center w-full max-w-xl mx-auto gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-8 w-8 rounded-full bg-muted/50"><ArrowLeft className="h-4 w-4" /></Button>
                    {otherUser && (
                        <div className="flex-1 flex items-center gap-2 overflow-hidden">
                            <Avatar className="h-9 w-9 border-2 border-primary/10">
                                <AvatarImage src={otherUser.avatar} />
                                <AvatarFallback className="text-xs font-black">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <h2 className="font-black text-xs leading-none truncate uppercase tracking-tighter">@{otherUser.username}</h2>
                                <p className={cn("text-[8px] font-bold uppercase mt-1", otherUser.isOnline ? "text-green-500" : "text-muted-foreground")}>
                                    {otherUser.isOnline ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain">
                <div className="max-w-xl mx-auto w-full space-y-2">
                    <div className="text-center py-4 opacity-20 flex items-center justify-center gap-2">
                        <ShieldCheck className="h-3 w-3" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em]">End-to-End Encrypted</p>
                    </div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-0.5 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div className={cn(
                                    "p-3 rounded-[1.2rem] shadow-sm relative", 
                                    isMine ? "bg-primary text-white rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
                                )}>
                                    <p className="text-[11px] font-bold whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                        <span className="text-[6px] font-mono">
                                            {msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : (msg.createdAt instanceof Date ? format(msg.createdAt, 'HH:mm') : '...')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            <footer className="p-3 border-t bg-background safe-area-bottom pb-8">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    <Input 
                        placeholder="Message..." 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        onKeyPress={(e) => { if(e.key === 'Enter') handleSend(newMessage); }}
                        className="h-11 rounded-full bg-muted/50 border-none px-4 text-[11px] font-bold" 
                    />
                    <Button onClick={() => handleSend(newMessage)} size="icon" disabled={!newMessage.trim()} className="h-11 w-11 rounded-full shadow-lg">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </footer>
        </div>
    );
}
