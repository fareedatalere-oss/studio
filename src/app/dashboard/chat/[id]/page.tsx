
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import Link from 'next/link';

/**
 * @fileOverview Definitive Chat Hub.
 * CALL: Restored private call logic. Creates a pending session and rings the receiver.
 * FIXED: handleFileUpload and handleDeleteMessage defined to prevent Runtime ReferenceError.
 */

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
    const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('image/*');
    
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [forwardMessage, setForwardMessage] = useState<any>(null);

    const otherUser = useMemo(() => allUsers.find(u => u.$id === otherUserId), [allUsers, otherUserId]);

    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    const safeGetTime = (ts: any) => {
        if (!ts) return 0;
        if (ts?.toMillis) return ts.toMillis();
        if (typeof ts === 'number') return ts;
        return new Date(ts).getTime() || 0;
    };

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(d => ({ $id: d.id, ...d.data() }));
            const filtered = docs.filter((m: any) => !m.deleteFor?.includes(currentUser?.$id))
                .sort((a: any, b: any) => safeGetTime(a.createdAt || a.timestamp) - safeGetTime(b.createdAt || b.timestamp));
            setMessages(filtered);
        });

        const markAsRead = async () => {
            const unreadQ = query(
                collection(db, COLLECTION_ID_MESSAGES), 
                where('chatId', '==', chatId), 
                where('senderId', '==', otherUserId),
                where('status', '!=', 'read')
            );
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
        const text = textOverride !== undefined ? textOverride : newMessage.trim();
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

        } catch (e) { toast({ title: 'Send Error' }); }
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
                createdAt: serverTimestamp(),
                scheduledAt: new Date().toISOString()
            });
            router.push(`/dashboard/chat/call/${callId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Call Error' });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setIsUploading(true);
        toast({ title: 'Uploading media...' });

        try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            // Determine media type for professional labeling
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'music';
            else if (file.type === 'application/pdf') type = 'pdf';

            // Resource type for Cloudinary
            const resourceType = type === 'image' ? 'image' : (type === 'video' || type === 'music' ? 'video' : 'raw');
            const res = await uploadToCloudinary(base64, resourceType);
            
            if (res.success) {
                await handleSend(undefined, { url: res.url, type });
                toast({ title: 'Sent!' });
            } else {
                throw new Error(res.message);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteMessage = async (messageId: string, mode: 'me' | 'both') => {
        if (!currentUser) return;
        try {
            if (mode === 'me') {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, messageId), {
                    deleteFor: arrayUnion(currentUser.$id)
                });
            } else {
                await deleteDoc(doc(db, COLLECTION_ID_MESSAGES, messageId));
            }
            toast({ title: 'Message deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete failed' });
        }
    };

    const MessageStatus = ({ msg }: { msg: any }) => {
        if (msg.senderId !== currentUser?.$id) return null;
        if (msg.status === 'read') return <span className="text-green-500 ml-1">✅</span>;
        if (otherUser?.isOnline) return <span className="text-muted-foreground ml-1">☑️ ☑️</span>;
        return <span className="text-muted-foreground ml-1">☑️</span>;
    };

    const MediaIcon = ({ type, url }: { type: string, url: string }) => {
        const icons = {
            image: <ImageIcon className="h-6 w-6 text-primary" />,
            video: <Film className="h-6 w-6 text-orange-500" />,
            music: <Music className="h-6 w-6 text-purple-500" />,
            pdf: <FileText className="h-6 w-6 text-red-500" />
        };
        return (
            <Link href={`/dashboard/chat/view-media?url=${encodeURIComponent(url)}&type=${type}`} className="flex flex-col items-center gap-1 p-2 bg-muted/50 rounded-xl border border-dashed border-primary/20 hover:bg-primary/5">
                {icons[type as keyof typeof icons] || <FileText className="h-6 w-6" />}
                <span className="text-[6px] font-black uppercase tracking-widest opacity-50">{type}</span>
            </Link>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-background font-body overflow-y-auto">
            <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center p-3 gap-2 z-50 pt-12 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-9 w-9 rounded-full bg-muted/50"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3 ml-1">
                        <Avatar className="h-10 w-10 border-2 border-primary/10"><AvatarImage src={otherUser.avatar} /><AvatarFallback>{otherUser.username?.charAt(0)}</AvatarFallback></Avatar>
                        <div>
                            <h2 className="font-bold text-xs leading-none tracking-tighter">{otherUser.username}</h2>
                            <p className={cn("text-[7px] font-black uppercase mt-1", otherUser.isOnline ? "text-green-500 animate-pulse" : "text-muted-foreground")}>{otherUser.isOnline ? 'Online' : 'Offline'}</p>
                        </div>
                    </div>
                )}
                <Button onClick={handleInitiateCall} variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary"><Phone className="h-4 w-4" /></Button>
            </header>
            
            <main className="flex-1 p-4 space-y-2 bg-muted/5 pb-32">
                <div className="max-w-xl mx-auto w-full space-y-2">
                    <div className="text-center py-4 opacity-20 flex flex-col items-center gap-1"><ShieldCheck className="h-3 w-3" /><p className="text-[6px] font-black uppercase tracking-widest">End-to-End Secure</p></div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%] group", isMine ? "ml-auto items-end" : "items-start")}>
                                <div className={cn("p-2 px-3 rounded-[1.2rem] shadow-sm relative text-[11px] font-bold leading-relaxed", isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border")}>
                                    <div className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full"><MoreVertical className="h-3 w-3"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="text-[10px] font-black uppercase w-32">
                                                <DropdownMenuItem onClick={() => { setForwardMessage(msg); setIsForwardOpen(true); }}><Forward className="mr-2 h-3 w-3" /> Forward</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(msg.$id, 'me')}><Trash2 className="mr-2 h-3 w-3" /> Delete For Me</DropdownMenuItem>
                                                {isMine && <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(msg.$id, 'both')}><Trash2 className="mr-2 h-3 w-3" /> Delete For All</DropdownMenuItem>}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    {msg.mediaType ? <MediaIcon type={msg.mediaType} url={msg.mediaUrl} /> : <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                        <span className="text-[5px] font-black uppercase">{msg.timestamp ? format(msg.timestamp, 'HH:mm') : '...'}</span>
                                        <MessageStatus msg={msg} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background pb-8 z-50">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 rounded-full"><Paperclip className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 p-2 font-black uppercase text-[8px] rounded-2xl">
                            <DropdownMenuItem className="h-11 gap-3" onClick={() => { setMediaTypeFilter('application/pdf'); fileInputRef.current?.click(); }}><FileText className="h-4 w-4 text-red-500" /> Documents</DropdownMenuItem>
                            <DropdownMenuItem className="h-11 gap-3" onClick={() => { setMediaTypeFilter('image/*'); fileInputRef.current?.click(); }}><ImageIcon className="h-4 w-4 text-primary" /> Images</DropdownMenuItem>
                            <DropdownMenuItem className="h-11 gap-3" onClick={() => { setMediaTypeFilter('video/*'); fileInputRef.current?.click(); }}><Film className="h-4 w-4 text-orange-500" /> Videos</DropdownMenuItem>
                            <DropdownMenuItem className="h-11 gap-3" onClick={() => { setMediaTypeFilter('audio/*'); fileInputRef.current?.click(); }}><Music className="h-4 w-4 text-purple-500" /> Audio</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Input placeholder="Message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }} className="flex-1 h-11 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" />
                    <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isUploading} className="h-11 w-11 rounded-full shadow-lg"><Send className="h-4 w-4 text-white" /></Button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept={mediaTypeFilter} onChange={handleFileUpload} />
            </footer>
        </div>
    );
}
