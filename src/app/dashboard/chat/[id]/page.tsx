
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    serverTimestamp, setDoc, updateDoc, 
    increment, getDocs, writeBatch, deleteDoc, arrayUnion
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, databases, DATABASE_ID, ID, COLLECTION_ID_MEETINGS } from '@/lib/appwrite';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, Phone, Check, CheckCheck, MoreHorizontal, Trash2, Forward, Mic, Square, Play, X, CheckCircle2 } from 'lucide-react';
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
    const { user: currentUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [forwardMsg, setForwardMsg] = useState<any>(null);
    
    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageMapRef = useRef<Map<string, any>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const markAsSeen = async () => {
            const q = query(
                collection(db, COLLECTION_ID_MESSAGES),
                where('chatId', '==', chatId)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;

            const batch = writeBatch(db);
            let hasChanges = false;
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.senderId === otherUserId && data.status !== 'seen') {
                    batch.update(d.ref, { status: 'seen' });
                    hasChanges = true;
                }
            });
            if (hasChanges) await batch.commit();
        };

        markAsSeen();
    }, [chatId, currentUser, otherUserId, messages.length]);

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
                messageMapRef.current.set(id, { $id: id, ...data });
            });
            const sorted = Array.from(messageMapRef.current.values()).sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
                const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
                return timeA - timeB;
            });
            setMessages(sorted);
        });

        const qRecent = query(collection(db, COLLECTION_ID_CHATS), where('participants', 'array-contains', currentUser.$id));
        const unsubRecent = onSnapshot(qRecent, async (snap) => {
            const chats = await Promise.all(snap.docs.map(async (d) => {
                const data = d.data();
                const targetId = data.participants.find((p: string) => p !== currentUser.$id);
                const prof = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, targetId).catch(() => null);
                return { $id: d.id, ...data, targetUser: prof };
            }));
            setRecentChats(chats.filter(c => c.targetUser));
        });

        return () => { unsub(); unsubOther(); unsubRecent(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: any, targetChatId?: string, targetParticipantId?: string) => {
        const activeChatId = targetChatId || chatId;
        const activeParticipantId = targetParticipantId || otherUserId;
        const text = textOverride !== undefined ? textOverride : newMessage.trim();
        
        if (!text && !mediaData) return;
        if (textOverride === undefined && !mediaData) setNewMessage('');

        const msgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
        try {
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId: activeChatId, 
                senderId: currentUser.$id, 
                text: text || '', 
                status: 'sent',
                createdAt: serverTimestamp(),
                deleteFor: [],
                ...(mediaData && { mediaUrl: mediaData.url, mediaType: mediaData.type })
            });
            await setDoc(doc(db, COLLECTION_ID_CHATS, activeChatId!), {
                participants: [currentUser.$id, activeParticipantId],
                lastMessage: text ? (text.length > 30 ? text.substring(0,30)+'...' : text) : `Sent a media file`,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${activeParticipantId}`]: increment(1)
            }, { merge: true });
            
            if (targetChatId) toast({ title: "Message Forwarded" });
        } catch (e) { toast({ variant: 'destructive', title: 'Error sending message' }); }
    };

    const handleDeleteForMe = async (msgId: string) => {
        try {
            await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), {
                deleteFor: arrayUnion(currentUser.$id)
            });
            toast({ title: "Deleted for me" });
        } catch (e) { toast({ variant: 'destructive', title: "Failed to delete" }); }
    };

    const handleDeleteForBoth = async (msgId: string) => {
        try {
            await deleteDoc(doc(db, COLLECTION_ID_MESSAGES, msgId));
            messageMapRef.current.delete(msgId);
            setMessages(prev => prev.filter(m => m.$id !== msgId));
            toast({ title: "Deleted for everyone" });
        } catch (e) { toast({ variant: 'destructive', title: "Delete Failed" }); }
    };

    const handleStartCall = async () => {
        if (!currentUser || !otherUserId) return;
        const callId = ID.unique();
        try {
            await setDoc(doc(db, COLLECTION_ID_MEETINGS, callId), {
                hostId: currentUser.$id,
                type: 'call',
                status: 'pending',
                invitedUsers: [otherUserId],
                createdAt: serverTimestamp()
            });
            router.push(`/dashboard/chat/call/${callId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Call Failed' });
        }
    };

    // Voice Recorder Implementation
    const startRecording = async () => {
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
            timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Mic access denied' });
        }
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
        toast({ title: 'Sending voice note...' });

        try {
            const reader = new FileReader();
            const b64: string = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });

            const uploadRes = await uploadToCloudinary(b64, 'auto');
            if (uploadRes.success) {
                await handleSend('', { url: uploadRes.url, type: 'audio' });
                cancelRecording();
            } else {
                throw new Error(uploadRes.message);
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Voice note failed', description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    const cancelRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const DeliveryStatus = ({ status, receiverOnline }: { status: string, receiverOnline?: boolean }) => {
        switch (status) {
            case 'sent': 
                return receiverOnline ? <CheckCheck className="h-3 w-3 opacity-40" /> : <Check className="h-3 w-3 opacity-40" />;
            case 'delivered': 
                return <CheckCheck className="h-3 w-3 opacity-40" />;
            case 'seen': 
                return <CheckCheck className="h-3 w-3 text-green-500" />;
            default: return null;
        }
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
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain bg-muted/5">
                <div className="max-w-xl mx-auto w-full space-y-3">
                    <div className="text-center py-6 opacity-20 flex flex-col items-center gap-2"><ShieldCheck className="h-4 w-4" /><p className="text-[7px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p></div>
                    {messages.filter(m => !m.deleteFor?.includes(currentUser.$id)).map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%] group", isMine ? "ml-auto items-end" : "items-start")}>
                                <div className={cn("p-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold leading-relaxed", isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border")}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {msg.mediaType === 'audio' ? (
                                                <audio src={msg.mediaUrl} controls className="h-8 max-w-[200px]" />
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 opacity-30 hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isMine ? 'end' : 'start'} className="font-black uppercase text-[9px]">
                                                <DropdownMenuItem onClick={() => setForwardMsg(msg)}>
                                                    <Forward className="mr-2 h-3.5 w-3.5" /> Forward
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteForMe(msg.$id)}>
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me
                                                </DropdownMenuItem>
                                                {isMine && (
                                                    <DropdownMenuItem onClick={() => handleDeleteForBoth(msg.$id)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for both
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[6px] font-black uppercase opacity-60">{msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : '...'}</span>
                                        {isMine && <DeliveryStatus status={msg.status} receiverOnline={otherUser?.isOnline} />}
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
                        <audio src={audioUrl} controls className="flex-1 h-8" />
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
                        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted"><Paperclip className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" onClick={handleStartCall} className="h-11 w-11 rounded-full text-primary hover:bg-primary/10"><Phone className="h-5 w-5" /></Button>
                        <Input 
                            placeholder="Type message..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }} 
                            className="flex-1 h-12 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" 
                        />
                        <Button onClick={startRecording} variant="ghost" size="icon" className="h-11 w-11 rounded-full text-primary hover:bg-primary/10"><Mic className="h-5 w-5" /></Button>
                        <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isUploading} className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">{isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5 text-white" />}</Button>
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" />
            </footer>

            <Dialog open={!!forwardMsg} onOpenChange={(o) => !o && setForwardMsg(null)}>
                <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none max-w-sm">
                    <div className="p-6 bg-primary text-white text-center">
                        <h3 className="font-black uppercase tracking-widest text-sm">Forward Message</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-4 px-2">Recent Contacts</p>
                        {recentChats.map(chat => (
                            <Button 
                                key={chat.$id}
                                variant="ghost" 
                                className="w-full justify-start h-14 rounded-2xl gap-3 hover:bg-primary/5 px-3"
                                onClick={() => {
                                    handleSend(forwardMsg.text, forwardMsg.mediaUrl ? { url: forwardMsg.mediaUrl, type: forwardMsg.mediaType } : undefined, chat.$id, chat.targetUser.$id);
                                    setForwardMsg(null);
                                }}
                            >
                                <Avatar className="h-10 w-10"><AvatarImage src={chat.targetUser?.avatar}/><AvatarFallback>{chat.targetUser?.username?.charAt(0)}</AvatarFallback></Avatar>
                                <span className="font-bold text-xs uppercase tracking-tighter">@{chat.targetUser?.username}</span>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
