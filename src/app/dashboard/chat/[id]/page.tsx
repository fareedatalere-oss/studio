
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    serverTimestamp, setDoc, updateDoc, 
    arrayUnion, increment 
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, databases, DATABASE_ID, ID, COLLECTION_ID_MEETINGS } from '@/lib/appwrite';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, MoreVertical, UserX, Trash2, Image as ImageIcon, Video, FileText, Phone, Mic, MicOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

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
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageMapRef = useRef<Map<string, any>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [activeMediaType, setActiveMediaType] = useState<'image' | 'video' | 'pdf' | null>(null);
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const chatRef = doc(db, COLLECTION_ID_CHATS, chatId);
        updateDoc(chatRef, { [`unreadCount.${currentUser.$id}`]: 0 }).catch(() => {});

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                const id = change.doc.id;
                if (data.deletedFor?.includes(currentUser.$id)) messageMapRef.current.delete(id);
                else messageMapRef.current.set(id, { $id: id, ...data });
            });
            const sorted = Array.from(messageMapRef.current.values()).sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
                const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
                return timeA - timeB;
            });
            setMessages(sorted);
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: any) => {
        const text = textOverride || newMessage.trim();
        if (!text && !mediaData) return;
        if (!textOverride && !mediaData) setNewMessage('');

        const msgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
        try {
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId, senderId: currentUser.$id, text: text || '', 
                status: otherUser?.isOnline ? 'delivered' : 'sent',
                deletedFor: [], createdAt: serverTimestamp(),
                ...(mediaData && { mediaUrl: mediaData.url, mediaType: mediaData.type, duration: mediaData.duration })
            });
            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: text ? (text.length > 30 ? text.substring(0,30)+'...' : text) : `Sent a ${mediaData?.type || 'file'}`,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: increment(1)
            }, { merge: true });
        } catch (e) { toast({ variant: 'destructive', title: 'Error sending message' }); }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    setIsUploading(true);
                    const upload = await uploadToCloudinary(base64, 'raw');
                    if (upload.success) {
                        handleSend('', { url: upload.url, type: 'audio' });
                    }
                    setIsUploading(false);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Mic error', description: 'Please allow microphone access.' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleStartCall = async () => {
        if (!currentUser || !otherUserId) return;
        const callId = ID.unique();
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, {
                hostId: currentUser.$id,
                type: 'call',
                name: 'Private Call',
                status: 'pending',
                invitedUsers: [otherUserId],
                createdAt: new Date().toISOString()
            });
            router.push(`/dashboard/chat/call/${callId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Call Failed' });
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file); });
            const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'raw');
            const upload = await uploadToCloudinary(base64, type === 'raw' ? 'raw' : (type === 'image' ? 'image' : 'video'));
            if (upload.success) handleSend('', { url: upload.url, type: type === 'raw' ? 'pdf' : type });
        } catch (e) { toast({ variant: 'destructive', title: "Media send failed" }); } finally { setIsUploading(false); setActiveMediaType(null); }
    };

    return (
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-2 z-50 pt-12 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-10 w-10 rounded-full bg-muted/50"><ArrowLeft className="h-5 w-5" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3 overflow-hidden ml-1">
                        <Avatar className="h-11 w-11 border-2 border-primary/10 shadow-sm"><AvatarImage src={otherUser.avatar} className="object-cover" /><AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0)}</AvatarFallback></Avatar>
                        <div className="truncate">
                            <h2 className="font-bold text-xs leading-none truncate tracking-tighter">{otherUser.username}</h2>
                            <p className={cn("text-[8px] font-black uppercase mt-1.5", otherUser.isOnline ? "text-green-500 animate-pulse" : "text-muted-foreground")}>
                                {otherUser.isOnline ? 'Online Now' : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-black uppercase text-[10px]">
                        <DropdownMenuItem onClick={() => updateDoc(doc(db, COLLECTION_ID_PROFILES, currentUser.$id), { blockedUsers: arrayUnion(otherUserId) })} className="text-destructive"><UserX className="mr-2 h-4 w-4" /> Block User</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/dashboard/chat')}><Trash2 className="mr-2 h-4 w-4" /> Clear History</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain bg-muted/5">
                <div className="max-w-xl mx-auto w-full space-y-3">
                    <div className="text-center py-6 opacity-20 flex flex-col items-center gap-2"><ShieldCheck className="h-4 w-4" /><p className="text-[7px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p></div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", isMine ? "ml-auto items-end" : "items-start")}>
                                <div className={cn("p-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold leading-relaxed", isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border")}>
                                    {msg.mediaType === 'image' && <div onClick={() => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=image`)} className="cursor-pointer mb-2 rounded-xl overflow-hidden bg-muted border p-2"><ImageIcon className="h-10 w-10 text-primary opacity-50" /></div>}
                                    {msg.mediaType === 'video' && <div onClick={() => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=video`)} className="cursor-pointer mb-2 rounded-xl overflow-hidden bg-muted border p-2 relative"><Video className="h-10 w-10 text-primary opacity-50" /></div>}
                                    {msg.mediaType === 'audio' && <audio src={msg.mediaUrl} controls className="h-8 max-w-full" />}
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                        <span className="text-[6px] font-black uppercase">{msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : '...'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            <footer className="p-4 border-t bg-background safe-area-bottom pb-8">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted"><Paperclip className="h-5 w-5" /></Button>
                    
                    <Button variant="ghost" size="icon" onClick={handleStartCall} className="h-11 w-11 rounded-full text-primary hover:bg-primary/10">
                        <Phone className="h-5 w-5" />
                    </Button>

                    <Input 
                        placeholder="Type text only..." 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }} 
                        className="flex-1 h-12 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" 
                    />
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={cn("h-11 w-11 rounded-full transition-all", isRecording ? "text-red-500 bg-red-50 animate-pulse scale-125" : "text-muted-foreground hover:bg-muted")}
                    >
                        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>

                    <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isUploading} className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">{isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5 text-white" />}</Button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" onChange={handleFileSelect} />
            </footer>
        </div>
    );
}
