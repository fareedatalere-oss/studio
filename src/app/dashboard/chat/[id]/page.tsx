'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import client, { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, storage, BUCKET_ID_UPLOADS, COLLECTION_ID_NOTIFICATIONS, ID, Query } from '@/lib/appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, PlayCircle, Trash2, Play, Pause, Forward, Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return null;
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

const MessageStatus = ({ status, isMine }: { status: string, isMine: boolean }) => {
    if (!isMine) return null;
    
    switch (status) {
        case 'sent':
            return <Check className="h-3 w-3 text-muted-foreground/50" />;
        case 'delivered':
            return <CheckCheck className="h-3 w-3 text-muted-foreground/50" />;
        case 'read':
            return <CheckCheck className="h-3 w-3 text-green-500" />;
        default:
            return <Check className="h-3 w-3 text-muted-foreground/30" />;
    }
};

const VoiceNotePlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const handleTimeUpdate = () => { 
        if (audioRef.current && audioRef.current.duration) {
            setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
    };
    const handleLoadedMetadata = () => { 
        if (audioRef.current) setDuration(audioRef.current.duration || 0); 
    };
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => console.error("Audio Play Error:", e));
            }
            setIsPlaying(!isPlaying);
        }
    };
    useEffect(() => {
        const audio = audioRef.current;
        const handleEnded = () => setIsPlaying(false);
        audio?.addEventListener('ended', handleEnded);
        return () => audio?.removeEventListener('ended', handleEnded);
    }, []);

    return (
        <div className="flex items-center gap-2 w-full min-w-[180px] max-w-[220px] bg-black/5 p-2 rounded-xl">
            <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} preload="metadata" className="hidden" />
            <Button variant="secondary" size="icon" className="h-8 w-8 shrink-0 rounded-full bg-primary text-white" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${progress * 100}%` }} />
            </div>
        </div>
    );
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
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [messageToForward, setMessageToForward] = useState<any>(null);
    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;

    // Real-time Messages
    useEffect(() => {
        if (!chatId || !currentUser) return;

        const q = query(
            collection(db, COLLECTION_ID_MESSAGES),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setLoading(false);

            // Mark unread messages as read
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.senderId !== currentUser.$id && data.status !== 'read') {
                    updateDoc(doc(db, COLLECTION_ID_MESSAGES, d.id), { status: 'read' });
                }
            });
        });

        // Fetch other user profile and track online status
        const fetchOther = async () => {
            const d = await getDoc(doc(db, COLLECTION_ID_PROFILES, otherUserId));
            if (d.exists()) setOtherUser(d.data());
        };
        fetchOther();

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const updateChatList = async (text: string) => {
        if (!currentUser || !chatId) return;
        const data = { 
            participants: [currentUser.$id, otherUserId], 
            lastMessage: text, 
            lastMessageAt: serverTimestamp() 
        };
        try { await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, data); } 
        catch (e: any) { if (e.code === 404) await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, data); }
    };

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chatId) return;
        
        const text = newMessage.trim();
        setNewMessage('');
        setSending(true);
        
        try {
            const status = otherUser?.isOnline ? 'delivered' : 'sent';
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), { 
                chatId, 
                senderId: currentUser.$id, 
                text, 
                status 
            });
            await updateChatList(text);
        } catch (error: any) {
            setNewMessage(text);
        } finally { setSending(false); }
    };
    
    const handleSendMediaMessage = async (file: File) => {
        if (!file || !currentUser || !chatId) return;
        setSending(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const mediaUrl = upload.url;
            const typeLabel = file.type.startsWith('image/') ? 'Image' : file.type.startsWith('video/') ? 'Video' : 'Voice';
            
            const status = otherUser?.isOnline ? 'delivered' : 'sent';
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), { 
                chatId, 
                senderId: currentUser.$id, 
                mediaUrl, 
                text: `[media:${file.type}]`, 
                status 
            });
            await updateChatList(`Sent a ${typeLabel.toLowerCase()}`);
        } catch (error: any) { toast({ title: 'Error', variant: 'destructive' }); } 
        finally { setSending(false); }
    };
    
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setRecordingStatus('preview');
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            setRecordingStatus('recording');
        } catch (e) { toast({ variant: 'destructive', title: 'Mic Access Denied' }); }
    };

    const stopRecording = () => mediaRecorder?.stop();
    const handleSendAudio = () => {
        if (audioBlob) {
            handleSendMediaMessage(new File([audioBlob], `voice-note.webm`, { type: 'audio/webm' }));
            setRecordingStatus('idle'); setAudioBlob(null);
        }
    };

    const renderMessageContent = (message: any) => {
        const text = message.text || '';
        if (message.mediaUrl && text.startsWith('[media:')) {
            const mediaType = text.slice(7, -1);
            if (mediaType.startsWith('image/')) return (
                <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border">
                    <Image src={message.mediaUrl} alt="chat" fill className="object-cover" />
                </div>
            );
            if (mediaType.startsWith('video/')) return <video src={message.mediaUrl} controls className="max-w-[200px] rounded-lg" />;
            if (mediaType.startsWith('audio/')) return <VoiceNotePlayer src={message.mediaUrl} />;
        }
        return <p className="text-sm whitespace-pre-wrap font-medium">{text}</p>;
    };

    return (
        <div className="flex flex-col h-full bg-white text-gray-900">
            <header className="sticky top-16 md:top-0 bg-white border-b flex items-center p-2 gap-3 z-10 shadow-sm h-14">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser ? (
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Avatar className="h-9 w-9 border border-primary/20">
                                <AvatarImage src={otherUser.avatar} />
                                <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {otherUser.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>}
                        </div>
                        <div>
                            <h2 className="font-bold text-xs leading-none">{otherUser.username}</h2>
                            <p className="text-[8px] font-black uppercase text-muted-foreground mt-1">
                                {otherUser.isOnline ? 'Online' : 'Offline'}
                            </p>
                        </div>
                    </div>
                ) : <div className="animate-pulse flex items-center gap-2"><div className="h-9 w-9 bg-muted rounded-full"></div><div className="h-3 w-20 bg-muted rounded"></div></div>}
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-50/50 scrollbar-hide">
                {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
                    messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%] md:max-w-[70%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div className={cn("p-2.5 rounded-2xl shadow-sm", isMine ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white border rounded-bl-none")}>
                                    {renderMessageContent(msg)}
                                    <div className={cn("text-[8px] mt-1 flex items-center gap-1 justify-end opacity-70", isMine ? "text-primary-foreground" : "text-muted-foreground")}>
                                        {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
                                        <MessageStatus status={msg.status} isMine={isMine} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="sticky bottom-16 md:bottom-0 bg-white border-t p-2">
                {recordingStatus === 'recording' ? (
                    <div className="flex items-center w-full gap-2 px-2 h-10">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setRecordingStatus('idle')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        <div className="flex-1 bg-muted rounded-full h-8 flex items-center px-4"><div className="bg-red-500 h-2 w-2 rounded-full animate-pulse mr-2"></div><span className="text-[10px] font-mono text-muted-foreground">Recording...</span></div>
                        <Button type="button" size="icon" onClick={stopRecording} className="rounded-full h-8 w-8"><Pause className="h-4 w-4" /></Button>
                    </div>
                ) : recordingStatus === 'preview' ? (
                     <div className="flex items-center w-full gap-2 px-2 h-10">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setRecordingStatus('idle')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        <div className="flex-1 text-[10px] font-bold text-center">Audio Recorded</div>
                        <Button type="button" size="icon" onClick={handleSendAudio} disabled={sending} className="rounded-full h-8 w-8">{sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSendTextMessage} className="flex items-center gap-1 px-1">
                        <Input type="text" placeholder="Type..." value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={sending} className="h-9 bg-neutral-100 border-none rounded-full px-4 text-xs" />
                        <div className="flex gap-0.5">
                            <Button type="button" variant="ghost" size="icon" onClick={() => mediaInputRef.current?.click()} disabled={sending} className="h-9 w-9 rounded-full"><Paperclip className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={startRecording} disabled={sending} className="h-9 w-9 rounded-full"><Mic className="h-4 w-4" /></Button>
                        </div>
                        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="h-9 w-9 rounded-full shadow-md shrink-0">{sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}</Button>
                    </form>
                )}
            </footer>
            <input type="file" ref={mediaInputRef} onChange={e => e.target.files && handleSendMediaMessage(e.target.files[0])} className="hidden" accept="image/*,video/*" />
        </div>
    );
}
