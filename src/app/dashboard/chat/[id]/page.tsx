'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    serverTimestamp, setDoc, updateDoc, 
    increment, getDocs, writeBatch, deleteDoc, arrayUnion
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, COLLECTION_ID_MEETINGS } from '@/lib/data-service';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, Phone, MoreVertical, Trash2, Forward, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import Link from 'next/link';

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, profile: currentProfile, allUsers } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const otherUser = useMemo(() => allUsers.find(u => u.$id === otherUserId), [allUsers, otherUserId]);
    const chatId = useMemo(() => currentUser?.$id && otherUserId ? getChatId(currentUser.$id, otherUserId) : null, [currentUser?.$id, otherUserId]);

    useEffect(() => {
        if (!chatId || !currentUser) return;
        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(d => ({ $id: d.id, ...d.data() }));
            setMessages(docs.filter((m: any) => !m.deleteFor?.includes(currentUser?.$id)).sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0)));
        });

        const markAsRead = async () => {
            const unreadQ = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId), where('senderId', '==', otherUserId), where('status', '!=', 'read'));
            const snap = await getDocs(unreadQ);
            if (!snap.empty) {
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.update(d.ref, { status: 'read' }));
                await batch.commit();
                await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), { [`unreadCount.${currentUser.$id}`]: 0 }, { merge: true });
            }
        };
        markAsRead();
        return () => unsub();
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: any) => {
        if (!chatId || !currentUser || !currentProfile) return;
        const text = textOverride ?? newMessage.trim();
        if (!text && !mediaData) return;
        if (textOverride === undefined && !mediaData) setNewMessage('');

        try {
            await setDoc(doc(collection(db, COLLECTION_ID_MESSAGES)), { 
                chatId, senderId: currentUser.$id, text: text || '', 
                status: 'sent', createdAt: serverTimestamp(),
                timestamp: Date.now(), deleteFor: [],
                ...(mediaData && { mediaUrl: mediaData.url, mediaType: mediaData.type })
            });

            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: text ? (text.length > 20 ? text.substring(0,20)+'...' : text) : `Shared a ${mediaData?.type}`,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: increment(1)
            }, { merge: true });
        } catch (e) {}
    };

    const handleInitiateCall = async () => {
        if (!currentUser || !otherUserId) return;
        try {
            const callId = doc(collection(db, COLLECTION_ID_MEETINGS)).id;
            await setDoc(doc(db, COLLECTION_ID_MEETINGS, callId), {
                hostId: currentUser.$id,
                invitedUsers: [otherUserId],
                type: 'private_call',
                status: 'pending',
                name: `Call from @${currentProfile?.username}`,
                createdAt: serverTimestamp()
            });
            router.push(`/dashboard/chat/call/${callId}`);
        } catch (e) {}
    };

    const MessageStatus = ({ msg }: { msg: any }) => {
        if (msg.senderId !== currentUser?.$id) return null;
        if (msg.status === 'read') return <span className="text-green-500 ml-1">✅</span>;
        if (otherUser?.isOnline) return <span className="text-muted-foreground ml-1">☑️ ☑️</span>;
        return <span className="text-muted-foreground ml-1">☑️</span>;
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center p-3 gap-2 z-50 pt-12">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')}><ArrowLeft/></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarImage src={otherUser.avatar}/><AvatarFallback>{otherUser.username?.charAt(0)}</AvatarFallback></Avatar>
                        <div><h2 className="font-bold text-xs">@{otherUser.username}</h2><p className={cn("text-[7px] font-black uppercase", otherUser.isOnline ? "text-green-500" : "text-muted-foreground")}>{otherUser.isOnline ? 'Online' : 'Offline'}</p></div>
                    </div>
                )}
                <Button onClick={handleInitiateCall} variant="ghost" size="icon" className="text-primary"><Phone className="h-4 w-4" /></Button>
            </header>
            
            <main className="flex-1 p-4 space-y-2 bg-muted/5 pb-32">
                <div className="max-w-xl mx-auto w-full space-y-2">
                    {messages.map((msg) => (
                        <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", msg.senderId === currentUser?.$id ? "ml-auto items-end" : "items-start")}>
                            <div className={cn("p-2 px-3 rounded-[1.2rem] shadow-sm relative text-[11px] font-bold", msg.senderId === currentUser?.$id ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border")}>
                                {msg.mediaUrl ? <img src={msg.mediaUrl} className="max-w-full rounded-lg mb-1" alt="media"/> : <p className="whitespace-pre-wrap">{msg.text}</p>}
                                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                    <span className="text-[5px] font-black uppercase">{msg.timestamp ? format(msg.timestamp, 'HH:mm') : ''}</span>
                                    <MessageStatus msg={msg} />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background pb-8 z-50">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    <Input placeholder="Message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} className="flex-1 h-11 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold" />
                    <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim()} className="h-11 w-11 rounded-full"><Send className="h-4 w-4 text-white" /></Button>
                </div>
            </footer>
        </div>
    );
}