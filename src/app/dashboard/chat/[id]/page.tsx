
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, COLLECTION_ID_NOTIFICATIONS, storage, BUCKET_ID_UPLOADS, ID, increment } from '@/lib/appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit, doc, updateDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, Trash2, Play, Pause, Check, CheckCheck, Copy, ShieldAlert, UserX, UserCheck, Image as ImageIcon, Video, FileText, X, Square, Music } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0].substring(0, 15)}_${sortedIds[1].substring(0, 15)}`;
};

/**
 * MessageStatus Component
 * Strictly renders ticks for the SENDER only.
 */
const MessageStatus = ({ status, isMine }: { status: string, isMine: boolean }) => {
    if (!isMine) return null;
    switch (status) {
        case 'sent': return <Check className="h-2.5 w-2.5 text-white/50" />;
        case 'delivered': return <CheckCheck className="h-2.5 w-2.5 text-white/50" />;
        case 'read': return <CheckCheck className="h-2.5 w-2.5 text-green-400" />;
        default: return <Check className="h-2.5 w-2.5 text-white/30" />;
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
    const [newMessage, setNewMessage] = useState('');
    
    // Voice & Media
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'document' | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;

    const isBlocked = currentUserProfile?.blockedUsers?.includes(otherUserId) || otherUser?.blockedUsers?.includes(currentUser?.$id);

    useEffect(() => {
        if (!chatId || chatId === 'invalid_chat' || !currentUser) return;

        // Reset Unread Count for Receiver
        const clearUnread = async () => {
            const chatRef = doc(db, COLLECTION_ID_CHATS, chatId);
            await updateDoc(chatRef, {
                [`unreadCount.${currentUser.$id}`]: 0
            }).catch(() => {});
        };
        clearUnread();

        const q = query(
            collection(db, COLLECTION_ID_MESSAGES),
            where('chatId', '==', chatId),
            limit(100)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }))
                .filter((m: any) => !m.deletedForEveryone && !(m.deletedFor || []).includes(currentUser.$id));
            
            // Client-side sort
            msgs.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return timeA - timeB;
            });

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

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSend = async (text?: string, mediaUrl?: string, mediaType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text', duration?: string) => {
        if (!text?.trim() && !mediaUrl && !audioBlob) return;
        if (!currentUser || !chatId || chatId === 'invalid_chat') return;
        
        setIsUploading(true);
        try {
            let finalMediaUrl = mediaUrl;
            let finalMediaType = mediaType;

            if (audioBlob) {
                const file = new File([audioBlob], `voice-${Date.now()}.mp3`, { type: 'audio/mpeg' });
                const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
                finalMediaUrl = upload.url;
                finalMediaType = 'audio';
                duration = formatDuration(recordingTime);
            }

            const status = otherUser?.isOnline ? 'delivered' : 'sent';
            const msgId = ID.unique();

            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId, 
                senderId: currentUser.$id, 
                text: text?.trim() || '', 
                mediaUrl: finalMediaUrl || '',
                mediaType: finalMediaType,
                status,
                duration: duration || '',
                createdAt: serverTimestamp()
            });

            // Update Global Chat Metadata for both
            const lastText = finalMediaType === 'text' ? (text || '') : `Sent a ${finalMediaType}`;
            const chatRef = doc(db, COLLECTION_ID_CHATS, chatId);
            await setDoc(chatRef, {
                participants: [currentUser.$id, otherUserId],
                lastMessage: lastText,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: increment(1)
            }, { merge: true });

            // Trigger Offline Notification
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
                userId: otherUserId,
                senderId: currentUser.$id,
                type: 'message',
                description: `sent you a ${finalMediaType === 'text' ? 'message' : finalMediaType}.`,
                isRead: false,
                link: `/dashboard/chat/${currentUser.$id}`,
                createdAt: new Date().toISOString()
            }).catch(() => {});
            
            setAudioBlob(null);
            setAudioUrl(null);
            setRecordingTime(0);
            setSelectedMediaType(null);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedMediaType) return;

        if (selectedMediaType === 'video') {
            // Check for 5 minute limit (300 seconds)
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = async () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 300) {
                    toast({ variant: 'destructive', title: 'Video too long', description: 'Maximum video length is 5 minutes.' });
                    return;
                }
                await uploadAndSend(file, 'video');
            };
            video.src = URL.createObjectURL(file);
        } else {
            await uploadAndSend(file, selectedMediaType);
        }
    };

    const uploadAndSend = async (file: File, type: 'image' | 'video' | 'document') => {
        setIsUploading(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            await handleSend('', upload.url, type);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const deleteMessage = async (msgId: string, forEveryone: boolean) => {
        try {
            if (forEveryone) {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                    deletedForEveryone: true,
                    text: '🚫 This message was deleted.',
                    mediaUrl: '',
                    mediaType: 'text'
                });
            } else {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { deletedFor: arrayUnion(currentUser?.$id) });
            }
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
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-2 z-10 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        <Avatar className="h-9 w-9 border-2 border-primary/10">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback className="text-xs">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <h2 className="font-black text-xs leading-none truncate uppercase tracking-tighter">@{otherUser.username}</h2>
                            <p className={cn("text-[8px] font-bold uppercase mt-1", otherUser.isOnline ? "text-green-500" : "text-muted-foreground")}>
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
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-50/20 scrollbar-hide">
                {messages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.$id;
                    const isDeleted = msg.deletedForEveryone;
                    return (
                        <div key={msg.$id} className={cn("flex flex-col gap-0.5 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                            <div className="flex items-center gap-1 group">
                                <div className={cn(
                                    "p-3 rounded-[1.2rem] shadow-sm relative", 
                                    isMine ? "bg-primary text-white rounded-br-none" : "bg-white border rounded-bl-none",
                                    isDeleted && "opacity-50 italic"
                                )}>
                                    {msg.mediaType === 'audio' && !isDeleted && (
                                        <div className="flex items-center gap-3 min-w-[160px]">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white bg-white/10 rounded-full" onClick={() => { const a = new Audio(msg.mediaUrl); a.play(); }}><Play className="h-4 w-4 fill-current" /></Button>
                                            <div className="h-1 bg-white/20 flex-1 rounded-full overflow-hidden"><div className="h-full bg-white w-1/3 animate-pulse"></div></div>
                                            <span className="text-[8px] font-black uppercase">{msg.duration || 'Voice'}</span>
                                        </div>
                                    )}
                                    {msg.mediaType !== 'text' && msg.mediaType !== 'audio' && !isDeleted && (
                                        <Link href={`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=${msg.mediaType}`} className="block p-1 bg-black/5 rounded-lg mb-2">
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                {msg.mediaType === 'image' && <ImageIcon className="h-4 w-4" />}
                                                {msg.mediaType === 'video' && <Video className="h-4 w-4" />}
                                                {msg.mediaType === 'document' && <FileText className="h-4 w-4" />}
                                                <span className="text-[9px] font-black uppercase tracking-widest">{msg.mediaType}</span>
                                            </div>
                                        </Link>
                                    )}
                                    <p className="text-[11px] font-bold whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                        <span className="text-[7px] font-mono">{msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : ''}</span>
                                        <MessageStatus status={msg.status} isMine={isMine} />
                                    </div>
                                </div>
                                {!isDeleted && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"><MoreVertical className="h-3 w-3" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isMine ? "end" : "start"} className="w-32 font-black uppercase text-[9px]">
                                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(msg.text); toast({title:'Copied'}); }}><Copy className="mr-2 h-3 w-3" /> Copy</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => deleteMessage(msg.$id, false)} className="text-destructive"><Trash2 className="mr-2 h-3 w-3" /> Delete For Me</DropdownMenuItem>
                                            {isMine && <DropdownMenuItem onClick={() => deleteMessage(msg.$id, true)} className="text-destructive font-black">Delete For Both</DropdownMenuItem>}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-3 border-t bg-background safe-area-bottom">
                {isBlocked ? (
                    <div className="bg-muted/50 p-2 rounded-xl text-center">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Communication Restricted</p>
                    </div>
                ) : isRecording ? (
                    <div className="flex items-center justify-between gap-3 bg-red-50 p-2 rounded-2xl">
                        <div className="flex items-center gap-2 text-red-600">
                            <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-xs font-black font-mono">{formatDuration(recordingTime)}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { stopRecording(); setAudioBlob(null); setAudioUrl(null); }} className="h-10 w-10 text-destructive"><Trash2 className="h-5 w-5" /></Button>
                            <Button size="icon" onClick={stopRecording} className="h-10 w-10 bg-red-600 rounded-full"><Square className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ) : audioUrl ? (
                    <div className="flex items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl">
                        <Button variant="ghost" size="icon" onClick={() => { const a = new Audio(audioUrl); a.play(); }}><Play className="h-4 w-4" /></Button>
                        <span className="text-[10px] font-black uppercase text-primary">Voice Preview ({formatDuration(recordingTime)})</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            <Button size="icon" onClick={() => handleSend()} className="rounded-full h-10 w-10 bg-primary" disabled={isUploading}>
                                {isUploading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary"><Paperclip className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40 font-black uppercase text-[9px]">
                                    <DropdownMenuItem onClick={() => { setSelectedMediaType('image'); mediaInputRef.current?.setAttribute('accept', 'image/*'); mediaInputRef.current?.click(); }}>
                                        <ImageIcon className="mr-2 h-4 w-4" /> Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedMediaType('video'); mediaInputRef.current?.setAttribute('accept', 'video/*'); mediaInputRef.current?.click(); }}>
                                        <Video className="mr-2 h-4 w-4" /> Video (Max 5m)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedMediaType('document'); mediaInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt'); mediaInputRef.current?.click(); }}>
                                        <FileText className="mr-2 h-4 w-4" /> Document
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button type="button" variant="ghost" size="icon" onClick={startRecording} className="h-9 w-9 rounded-full text-primary"><Mic className="h-4 w-4" /></Button>
                        </div>
                        <Input 
                            placeholder="Message..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            onKeyPress={(e) => { if(e.key === 'Enter') handleSend(newMessage); }}
                            className="h-10 rounded-full bg-muted/50 border-none px-4 text-[11px] font-bold" 
                        />
                        <Button onClick={() => { handleSend(newMessage); setNewMessage(''); }} size="icon" disabled={!newMessage.trim() && !isUploading} className="h-10 w-10 rounded-full shadow-lg">
                            {isUploading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                        <input type="file" ref={mediaInputRef} className="hidden" onChange={handleFileSelect} />
                    </div>
                )}
            </footer>
        </div>
    );
}
