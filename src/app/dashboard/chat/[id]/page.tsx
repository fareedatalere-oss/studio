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
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, COLLECTION_ID_MEETINGS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/data-service';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, Phone, MoreVertical, Trash2, Forward, Mic, X, CheckCircle2, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { uploadToCloudinary } from '@/app/actions/cloudinary';

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, profile: currentProfile } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [forwardMessage, setForwardMessage] = useState<any>(null);

    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    const safeGetTime = (ts: any) => {
        if (!ts) return 0;
        if (ts?.toMillis) return ts.toMillis();
        if (ts?.toDate) return ts.toDate().getTime();
        if (typeof ts === 'number') return ts;
        if (typeof ts === 'string') return new Date(ts).getTime();
        return 0;
    };

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const markAsSeen = async () => {
            const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => {
                if (d.data().senderId === otherUserId && d.data().status !== 'seen') {
                    batch.update(d.ref, { status: 'seen' });
                }
            });
            await batch.commit().catch(() => {});
            
            // Reset unread count
            await updateDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                [`unreadCount.${currentUser.$id}`]: 0
            }).catch(() => {});
        };
        markAsSeen();

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(d => ({ $id: d.id, ...d.data() }));
            const filtered = docs.filter((m: any) => !m.deleteFor?.includes(currentUser?.$id))
                .sort((a: any, b: any) => {
                    const timeA = safeGetTime(a?.createdAt || a?.timestamp);
                    const timeB = safeGetTime(b?.createdAt || b?.timestamp);
                    return timeA - timeB;
                });
            setMessages(filtered);
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: any) => {
        if (!chatId || !currentUser || !currentProfile) return;
        const text = textOverride !== undefined ? textOverride : newMessage.trim();
        if (!text && !mediaData) return;
        if (textOverride === undefined && !mediaData) setNewMessage('');

        const msgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
        try {
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId: chatId, 
                senderId: currentUser.$id, 
                text: text || '', 
                status: 'sent',
                createdAt: serverTimestamp(),
                timestamp: Date.now(),
                deleteFor: [],
                ...(mediaData && { mediaUrl: mediaData.url, mediaType: mediaData.type })
            });

            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: text ? (text.length > 30 ? text.substring(0,30)+'...' : text) : `Shared a file`,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: increment(1)
            }, { merge: true });

            // SEND REAL-TIME PUSH NOTIFICATION
            await setDoc(doc(collection(db, COLLECTION_ID_NOTIFICATIONS)), {
                userId: otherUserId,
                senderId: currentUser.$id,
                type: 'message',
                description: `sent you a message: ${text || 'media'}`,
                isRead: false,
                link: `/dashboard/chat/${currentUser.$id}`,
                createdAt: new Date().toISOString()
            });

        } catch (e) { toast({ variant: 'destructive', title: 'Send Error' }); }
    };

    const handleStartCall = async () => {
        if (!currentUser || !otherUserId || !otherUser) return;
        const callId = doc(collection(db, COLLECTION_ID_MEETINGS)).id;
        try {
            await setDoc(doc(db, COLLECTION_ID_MEETINGS, callId), {
                hostId: currentUser.$id,
                invitedUsers: [otherUserId],
                type: 'call',
                status: 'pending',
                createdAt: serverTimestamp(),
                activeView: 'none'
            });
            router.push(`/dashboard/chat/call/${callId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Call Failed' });
        }
    };

    const startRecording = async () => {
        if (typeof window === 'undefined') return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };
            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => setRecordingDuration(p => p >= 3600 ? 3600 : p + 1), 1000);
        } catch (err) { toast({ variant: 'destructive', title: 'Mic Access Error' }); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleSendVoice = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const b64: string = await new Promise((res) => {
                reader.onloadend = () => res(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });
            const up = await uploadToCloudinary(b64, 'video'); 
            if (up.success) {
                await handleSend('', { url: up.url, type: 'audio' });
                cancelRecording();
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: up.message });
            }
        } catch (err: any) { toast({ variant: 'destructive', title: 'Failed' }); }
        finally { setIsUploading(false); }
    };

    const cancelRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-2 z-50 pt-12 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-10 w-10 rounded-full bg-muted/50"><ArrowLeft className="h-5 w-5" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3 overflow-hidden ml-1">
                        <Avatar className="h-11 w-11 border-2 border-primary/10 shadow-sm">
                            <AvatarImage src={otherUser.avatar} className="object-cover" />
                            <AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <h2 className="font-bold text-xs leading-none truncate tracking-tighter">{otherUser.username}</h2>
                            <p className={cn("text-[8px] font-black uppercase mt-1.5", otherUser.isOnline ? "text-green-500 animate-pulse" : "text-muted-foreground")}>
                                {otherUser.isOnline ? 'Online Now' : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <Button onClick={handleStartCall} variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary hover:bg-primary/10">
                    <Phone className="h-5 w-5" />
                </Button>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain bg-muted/5">
                <div className="max-w-xl mx-auto w-full space-y-3">
                    <div className="text-center py-6 opacity-20 flex flex-col items-center gap-2"><ShieldCheck className="h-4 w-4" /><p className="text-[7px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p></div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%] group", isMine ? "ml-auto items-end" : "items-start")}>
                                <div className={cn("p-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold leading-relaxed", isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border")}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {msg.mediaType === 'audio' ? (
                                                <audio src={msg.mediaUrl} key={msg.mediaUrl} controls className="h-8 max-w-[200px]" preload="auto" playsInline />
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 opacity-30 hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isMine ? 'end' : 'start'} className="font-black uppercase text-[9px]">
                                                <DropdownMenuItem onClick={() => updateDoc(doc(db, COLLECTION_ID_MESSAGES, msg.$id), { deleteFor: arrayUnion(currentUser?.$id) })}>
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me
                                                </DropdownMenuItem>
                                                {isMine && (
                                                    <DropdownMenuItem onClick={() => deleteDoc(doc(db, COLLECTION_ID_MESSAGES, msg.$id))} className="text-destructive">
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for both
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => { setForwardMessage(msg); setIsForwardOpen(true); }}><Forward className="mr-2 h-3.5 w-3.5" /> Forward</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[6px] font-black uppercase opacity-60">
                                            {msg.createdAt && typeof msg.createdAt.toMillis === 'function' 
                                                ? format(msg.createdAt.toMillis(), 'HH:mm') 
                                                : (msg.timestamp ? format(msg.timestamp, 'HH:mm') : '...')}
                                        </span>
                                        {isMine && (
                                            <div className="flex items-center -mb-0.5">
                                                {msg.status === 'seen' ? (
                                                    <CheckCircle2 className="h-2 w-2 text-white" />
                                                ) : otherUser?.isOnline ? (
                                                    <div className="flex gap-px">
                                                        <Check className="h-2 w-2 text-white/80" />
                                                        <Check className="h-2 w-2 text-white/80 -ml-1" />
                                                    </div>
                                                ) : (
                                                    <Check className="h-2 w-2 text-white/40" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            <footer className="p-4 border-t bg-background safe-area-bottom pb-8">
                {audioUrl ? (
                    <div className="max-w-xl mx-auto w-full flex items-center gap-3 bg-muted/50 p-2 rounded-2xl animate-in slide-in-from-bottom-2">
                        <Button onClick={cancelRecording} variant="ghost" size="icon" className="h-10 w-10 text-destructive"><X className="h-5 w-5" /></Button>
                        <audio src={audioUrl} controls className="flex-1 h-8" preload="auto" />
                        <Button onClick={handleSendVoice} size="icon" className="h-10 w-10 bg-green-500 hover:bg-green-600 rounded-full" disabled={isUploading}><CheckCircle2 className="h-5 w-5 text-white" /></Button>
                    </div>
                ) : isRecording ? (
                    <div className="max-w-xl mx-auto w-full flex items-center gap-4 bg-primary/10 p-3 rounded-2xl animate-pulse">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <p className="flex-1 font-black text-xs uppercase tracking-widest text-primary">Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</p>
                        <Button onClick={stopRecording} variant="destructive" size="sm" className="rounded-full h-8 px-4 font-black uppercase text-[10px]">Stop</Button>
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-11 w-11 rounded-full"><Paperclip className="h-5 w-5" /></Button>
                        <Input placeholder="Type message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }} className="flex-1 h-12 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" />
                        <Button onClick={startRecording} variant="ghost" size="icon" className="h-11 w-11 rounded-full text-primary hover:bg-primary/10"><Mic className="h-5 w-5" /></Button>
                        <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isUploading} className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">{isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5 text-white" />}</Button>
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" />
            </footer>

            <Dialog open={isForwardOpen} onOpenChange={setIsForwardOpen}>
                <DialogContent className="rounded-[2.5rem]">
                    <DialogHeader><DialogTitle className="text-center font-black uppercase text-sm">Forward Message</DialogTitle></DialogHeader>
                    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-center mb-4">Click to resend here</p>
                        <Button variant="outline" className="w-full h-14 rounded-2xl font-black uppercase text-[10px]" onClick={() => { if(forwardMessage) { handleSend(forwardMessage.text, forwardMessage.mediaUrl ? {url: forwardMessage.mediaUrl, type: forwardMessage.mediaType} : null); setIsForwardOpen(false); toast({title: 'Forwarded'}); } }}>Resend Here</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
