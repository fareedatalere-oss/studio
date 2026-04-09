'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import client, { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, storage, BUCKET_ID_UPLOADS, ID, Query } from '@/lib/appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, Trash2, Play, Pause, Forward, Check, CheckCheck, Copy, ShieldAlert, UserX, UserCheck, Image as ImageIcon, Video, FileText, X, Square } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

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
    const [isForwarding, setIsForwarding] = useState(false);
    const [msgToForward, setMsgToForward] = useState<any>(null);
    
    // Voice Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Media States
    const [isUploading, setIsUploading] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
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

            // Mark as Read Logic
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

        // Sync Recent Chats for Forwarding
        const unsubRecent = onSnapshot(
            query(collection(db, COLLECTION_ID_CHATS), where('participants', 'array-contains', currentUser.$id), orderBy('lastMessageAt', 'desc')),
            (snap) => setRecentChats(snap.docs.map(d => ({ $id: d.id, ...d.data() })))
        );

        // Real-time other user presence
        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        return () => { unsub(); unsubRecent(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (text?: string, mediaUrl?: string, mediaType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text') => {
        if (!text?.trim() && !mediaUrl && !audioUrl) return;
        if (!currentUser || !chatId || chatId === 'invalid_chat') return;
        
        try {
            let finalMediaUrl = mediaUrl;
            if (audioBlob) {
                const file = new File([audioBlob], `voice-${Date.now()}.mp3`, { type: 'audio/mpeg' });
                const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
                finalMediaUrl = upload.url;
                mediaType = 'audio';
            }

            // Determine initial status based on recipient online state
            const status = otherUser?.isOnline ? 'delivered' : 'sent';

            await setDoc(doc(db, COLLECTION_ID_MESSAGES, ID.unique()), { 
                chatId, 
                senderId: currentUser.$id, 
                text: text?.trim() || '', 
                mediaUrl: finalMediaUrl || '',
                mediaType,
                status,
                createdAt: serverTimestamp()
            });

            // Update/Create Chat Document for Recent List
            const lastText = mediaType === 'text' ? (text || '') : `Sent a ${mediaType}`;
            const chatRef = doc(db, COLLECTION_ID_CHATS, chatId);
            await setDoc(chatRef, {
                participants: [currentUser.$id, otherUserId],
                lastMessage: lastText,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            
            setAudioBlob(null);
            setAudioUrl(null);
            setRecordingTime(0);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error sending message' });
        }
    };

    // Voice Recorder Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/mpeg' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Microphone access denied' });
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const formatTimer = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Media Logic
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = async () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 300) {
                    toast({ variant: 'destructive', title: 'Video too long', description: 'Maximum video duration is 5 minutes.' });
                    return;
                }
                uploadAndSend(file, 'video');
            };
            video.src = URL.createObjectURL(file);
        } else if (file.type.startsWith('image/')) {
            uploadAndSend(file, 'image');
        } else {
            uploadAndSend(file, 'document');
        }
    };

    const uploadAndSend = async (file: File, type: 'image' | 'video' | 'document') => {
        setIsUploading(true);
        toast({ title: `Uploading ${type}...` });
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            await handleSend('', upload.url, type);
            toast({ title: 'Sent successfully!' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied to Clipboard' });
    };

    const handleForward = async (targetUserId: string) => {
        if (!msgToForward) return;
        const targetChatId = getChatId(currentUser?.$id, targetUserId);
        if (targetChatId) {
            const status = 'sent'; // Simplified for forwarding
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, ID.unique()), { 
                chatId: targetChatId, 
                senderId: currentUser?.$id, 
                text: msgToForward.text || '', 
                mediaUrl: msgToForward.mediaUrl || '',
                mediaType: msgToForward.mediaType,
                status,
                createdAt: serverTimestamp()
            });
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
        <div className="flex flex-col h-screen bg-white font-body">
            <header className="sticky top-0 bg-white border-b flex items-center p-2 gap-2 z-10 shadow-sm h-12">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        <Avatar className="h-8 w-8 border border-primary/10">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback className="text-[10px]">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <h2 className="font-black text-[11px] leading-none truncate uppercase tracking-tighter">@{otherUser.username}</h2>
                            <p className={cn("text-[8px] font-bold uppercase mt-0.5", otherUser.isOnline ? "text-green-500" : "text-muted-foreground")}>
                                {otherUser.isOnline ? 'Online' : otherUser.lastSeen ? `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen.toDate()), { addSuffix: true })}` : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 font-black uppercase text-[9px]">
                        <DropdownMenuItem onClick={toggleBlock} className={cn(isBlocked ? "text-green-600" : "text-destructive")}>
                            {currentUserProfile?.blockedUsers?.includes(otherUserId) ? <><UserCheck className="mr-2 h-3.5 w-3.5" /> Unblock</> : <><ShieldAlert className="mr-2 h-3.5 w-3.5" /> Block User</>}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            
            <main className="flex-1 overflow-y-auto p-3 space-y-2 bg-neutral-50/50 scrollbar-hide">
                {messages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.$id;
                    return (
                        <div key={msg.$id} className={cn("flex flex-col gap-0.5 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                            <div className="flex items-center gap-1 group">
                                <div className={cn("p-2 rounded-2xl shadow-sm relative", isMine ? "bg-primary text-white rounded-br-none" : "bg-white border rounded-bl-none")}>
                                    {msg.mediaType === 'audio' && (
                                        <div className="flex items-center gap-2 min-w-[150px]">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => { const a = new Audio(msg.mediaUrl); a.play(); }}><Play className="h-4 w-4 fill-current" /></Button>
                                            <div className="h-1 bg-white/20 flex-1 rounded-full overflow-hidden"><div className="h-full bg-white w-1/3"></div></div>
                                            <span className="text-[8px] font-bold">VN</span>
                                        </div>
                                    )}
                                    {msg.mediaType !== 'text' && msg.mediaType !== 'audio' && (
                                        <Link href={`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=${msg.mediaType}`} className="block p-1 bg-black/5 rounded-lg mb-1">
                                            <div className="flex items-center gap-2 px-2 py-1">
                                                {msg.mediaType === 'image' && <ImageIcon className="h-4 w-4" />}
                                                {msg.mediaType === 'video' && <Video className="h-4 w-4" />}
                                                {msg.mediaType === 'document' && <FileText className="h-4 w-4" />}
                                                <span className="text-[9px] font-black uppercase tracking-widest">{msg.mediaType}</span>
                                            </div>
                                        </Link>
                                    )}
                                    {msg.text && <p className="text-[11px] font-medium whitespace-pre-wrap">{msg.text}</p>}
                                    <div className="flex items-center justify-end gap-1 mt-0.5 opacity-60">
                                        <span className="text-[7px] font-mono">{msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : ''}</span>
                                        <MessageStatus status={msg.status} isMine={isMine} />
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"><MoreVertical className="h-3 w-3" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isMine ? "end" : "start"} className="w-32 font-black uppercase text-[9px]">
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

            <footer className="p-2 border-t bg-white safe-area-bottom">
                {isBlocked ? (
                    <div className="bg-muted/50 p-2 rounded-xl text-center">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Communication Restricted</p>
                    </div>
                ) : isRecording ? (
                    <div className="flex items-center justify-between gap-3 bg-red-50 p-2 rounded-2xl animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 text-red-600">
                            <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-xs font-black font-mono">{formatTimer(recordingTime)}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { stopRecording(); setAudioBlob(null); setAudioUrl(null); setIsRecording(false); }} className="h-10 w-10 text-destructive"><Trash2 className="h-5 w-5" /></Button>
                            <Button size="icon" onClick={stopRecording} className="h-10 w-10 bg-red-600 rounded-full"><Square className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ) : audioUrl ? (
                    <div className="flex items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { const a = new Audio(audioUrl); a.play(); }}><Play className="h-4 w-4" /></Button>
                            <span className="text-[10px] font-black uppercase text-primary">Voice Preview</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="text-destructive"><X className="h-4 w-4" /></Button>
                            <Button size="icon" onClick={() => handleSend()} className="rounded-full bg-primary"><Send className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(newMessage); setNewMessage(''); }} className="flex items-center gap-2">
                        <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => mediaInputRef.current?.click()} className="h-9 w-9 rounded-full text-primary hover:bg-primary/5"><Paperclip className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={startRecording} className="h-9 w-9 rounded-full text-primary hover:bg-primary/5"><Mic className="h-4 w-4" /></Button>
                        </div>
                        <Input 
                            placeholder="Write message..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            className="h-9 rounded-full bg-muted/50 border-none px-4 text-[11px] font-bold shadow-none" 
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()} className="h-9 w-9 rounded-full shadow-lg"><Send className="h-4 w-4" /></Button>
                        <input type="file" ref={mediaInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*,.pdf,.doc,.docx" />
                    </form>
                )}
            </footer>

            <Dialog open={isForwarding} onOpenChange={setIsForwarding}>
                <DialogContent className="max-w-sm rounded-[2rem] p-6 border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-center font-black uppercase text-[10px] tracking-[0.3em] pb-4">Forward To</DialogTitle></DialogHeader>
                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto scrollbar-hide">
                        {recentChats.map(chat => {
                            const otherId = chat.participants.find((p: string) => p !== currentUser?.$id);
                            return (
                                <Button key={chat.$id} variant="outline" className="w-full justify-start h-12 rounded-2xl gap-3 border-muted hover:border-primary transition-all" onClick={() => handleForward(otherId)}>
                                    <Avatar className="h-8 w-8"><AvatarFallback>@</AvatarFallback></Avatar>
                                    <p className="font-black uppercase text-[10px] tracking-tighter">Recipient</p>
                                </Button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}