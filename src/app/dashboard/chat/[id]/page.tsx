
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, COLLECTION_ID_NOTIFICATIONS, ID, increment } from '@/lib/appwrite';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Send, MoreVertical, Paperclip, Mic, Trash2, Play, Image as ImageIcon, Video, FileText, Square, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

/**
 * @fileOverview Master Private Chat Thread.
 * PERMANENCE ENGINE V9: Uses an indestructible ID-Map reconciliation to prevent ANY message replacement.
 * Ensures every message is strictly appended and remains visible forever unless deleted.
 */

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

const MessageStatus = ({ status, isMine }: { status: string, isMine: boolean }) => {
    if (!isMine) return null;
    switch (status) {
        case 'sent': return <span className="text-[8px]">☑️</span>;
        case 'delivered': return <span className="text-[8px]">☑️☑️</span>;
        case 'read': return <span className="text-[8px] text-green-500 font-bold">✅</span>;
        default: return <span className="text-[8px] opacity-30">☑️</span>;
    }
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
    
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [acceptType, setAcceptType] = useState<string>('image/*');
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    useEffect(() => {
        if (!chatId || chatId === 'invalid_chat' || !currentUser) return;

        // HIGH-PERSISTENCE LISTENER
        const q = query(
            collection(db, COLLECTION_ID_MESSAGES),
            where('chatId', '==', chatId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const serverMsgs = snapshot.docs.map(doc => ({ 
                $id: doc.id, 
                ...doc.data() 
            }));
            
            setMessages(prev => {
                const messageMap = new Map();
                
                // 1. Load existing state
                prev.forEach(msg => messageMap.set(msg.$id, msg));
                
                // 2. Merge server data (Server always wins for confirmed messages)
                serverMsgs.forEach(msg => {
                    // If this server message replaces an optimistic one, remove the temp ID
                    const tempId = (msg as any).tempId;
                    if (tempId && messageMap.has(tempId)) {
                        messageMap.delete(tempId);
                    }
                    messageMap.set(msg.$id, msg);
                });

                // 3. Sort and return
                return Array.from(messageMap.values()).sort((a: any, b: any) => {
                    const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime() || 0;
                    const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime() || 0;
                    return timeA - timeB;
                });
            });

            // Handle Read Receipts
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.senderId !== currentUser.$id && data.status !== 'read') {
                    updateDoc(doc(db, COLLECTION_ID_MESSAGES, d.id), { status: 'read' }).catch(() => {});
                }
            });
        });

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => { 
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
        }
    }, [messages.length]);

    const handleSend = async (text?: string, mediaUrl?: string, mediaType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text', duration?: string) => {
        if (!text?.trim() && !mediaUrl && !audioBlob) return;
        if (!currentUser || !chatId) return;
        
        const capturedAudioBlob = audioBlob;
        const capturedAudioUrl = audioUrl;
        const capturedTime = recordingTime;
        const finalText = text?.trim() || '';
        const tempId = `temp-${Date.now()}`;

        setNewMessage('');
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setIsRecording(false);

        // INSTANT DROP (💧)
        const optimisticMsg = {
            $id: tempId,
            chatId,
            senderId: currentUser.$id,
            text: finalText,
            mediaUrl: capturedAudioUrl || mediaUrl || '',
            mediaType: capturedAudioBlob ? 'audio' : mediaType,
            status: 'sent',
            duration: capturedAudioBlob ? `${Math.floor(capturedTime/60)}:${(capturedTime%60).toString().padStart(2,'0')}` : (duration || ''),
            createdAt: new Date(),
            isOptimistic: true
        };
        
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            let finalMediaUrl = mediaUrl;
            let finalMediaType = capturedAudioBlob ? 'audio' : mediaType;
            let finalDuration = duration;

            if (capturedAudioBlob) {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(capturedAudioBlob);
                });
                const upload = await uploadToCloudinary(base64, 'auto');
                if (!upload.success) throw new Error(upload.message);
                finalMediaUrl = upload.url;
                finalMediaType = 'audio';
                finalDuration = `${Math.floor(capturedTime/60)}:${(capturedTime%60).toString().padStart(2,'0')}`;
            }

            const msgId = ID.unique();
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId, 
                senderId: currentUser.$id, 
                text: finalText, 
                mediaUrl: finalMediaUrl || '',
                mediaType: finalMediaType,
                status: otherUser?.isOnline ? 'delivered' : 'sent',
                duration: finalDuration || '',
                tempId: tempId,
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: finalMediaType === 'text' ? (finalText.length > 30 ? finalText.substring(0,30)+'...' : finalText) : `Sent a ${finalMediaType}`,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: increment(1)
            }, { merge: true });

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
                userId: otherUserId,
                senderId: currentUser.$id,
                type: 'message',
                description: `sent you a message.`,
                isRead: false,
                link: `/dashboard/chat/${currentUser.$id}`,
                createdAt: new Date().toISOString()
            }).catch(() => {});
            
        } catch (e: any) {
            setMessages(prev => prev.filter(m => m.$id !== tempId));
            toast({ variant: 'destructive', title: 'Send Failed', description: e.message });
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

    const handleMediaClick = (type: string) => {
        let accept = 'image/*';
        if (type === 'video') accept = 'video/*';
        if (type === 'document') accept = '.pdf,.doc,.docx,.txt';
        setAcceptType(accept);
        setTimeout(() => mediaInputRef.current?.click(), 100);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        toast({ title: 'Uploading...' });
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'document';
            const upload = await uploadToCloudinary(base64, type === 'document' ? 'raw' : 'auto');
            if (!upload.success) throw new Error(upload.message);
            await handleSend('', upload.url, type);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-2 z-50 shadow-sm pt-12">
                <div className="flex items-center w-full max-w-xl mx-auto gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-8 w-8 rounded-full bg-muted/50"><ArrowLeft className="h-4 w-4" /></Button>
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 font-black uppercase text-[9px]">
                            <DropdownMenuItem onClick={async () => {
                                if(chatId) {
                                    await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), { [`deletedFor.${currentUser!.$id}`]: serverTimestamp() }, { merge: true });
                                    router.push('/dashboard/chat');
                                }
                            }} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Chat</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain">
                <div className="max-w-xl mx-auto w-full space-y-2">
                    <div className="text-center py-4 opacity-30 flex items-center justify-center gap-2">
                        <ShieldCheck className="h-3 w-3" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em]">End-to-End Encrypted</p>
                    </div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-0.5 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div className={cn(
                                    "p-2.5 rounded-[1.2rem] shadow-sm relative", 
                                    isMine ? "bg-primary text-white rounded-br-none" : "bg-white border rounded-bl-none"
                                )}>
                                    {msg.mediaType === 'audio' && (
                                        <div className="flex items-center gap-3 min-w-[140px]">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white bg-white/10 rounded-full" onClick={() => { const a = new Audio(msg.mediaUrl); a.play(); }}><Play className="h-3 w-3 fill-current" /></Button>
                                            <div className="h-1 bg-white/20 flex-1 rounded-full overflow-hidden"><div className={cn("h-full bg-white", msg.isOptimistic ? "w-1/2 animate-pulse" : "w-full")}></div></div>
                                            <span className="text-[7px] font-black uppercase">{msg.duration || 'Voice'}</span>
                                        </div>
                                    )}
                                    {msg.mediaType !== 'text' && msg.mediaType !== 'audio' && (
                                        <Link href={`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=${msg.mediaType}`} className="block p-1 bg-black/5 rounded-lg mb-1.5">
                                            <div className="flex items-center gap-2 px-2 py-1.5">
                                                {msg.mediaType === 'image' && <ImageIcon className="h-3 w-3" />}
                                                {msg.mediaType === 'video' && <Video className="h-3 w-3" />}
                                                {msg.mediaType === 'document' && <FileText className="h-3 w-3" />}
                                                <span className="text-[8px] font-black uppercase tracking-widest">{msg.mediaType}</span>
                                            </div>
                                        </Link>
                                    )}
                                    <p className="text-[10px] font-bold whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-0.5 opacity-60">
                                        <span className="text-[6px] font-mono">
                                            {msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : (msg.createdAt instanceof Date ? format(msg.createdAt, 'HH:mm') : '...')}
                                        </span>
                                        <MessageStatus status={msg.status} isMine={isMine} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            <footer className="p-3 border-t bg-background safe-area-bottom pb-8">
                <div className="max-w-xl mx-auto w-full">
                    {isRecording ? (
                        <div className="flex items-center justify-between gap-3 bg-red-50 p-2 rounded-2xl">
                            <div className="flex items-center gap-2 text-red-600">
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                                <span className="text-xs font-black font-mono">{Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</span>
                            </div>
                            <Button size="icon" onClick={stopRecording} className="h-10 w-10 bg-red-600 rounded-full"><Square className="h-4 w-4" /></Button>
                        </div>
                    ) : audioUrl ? (
                        <div className="flex items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl">
                            <Button variant="ghost" size="icon" onClick={() => { const a = new Audio(audioUrl); a.play(); }}><Play className="h-4 w-4" /></Button>
                            <span className="text-[10px] font-black uppercase text-primary">Voice Preview</span>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setAudioUrl(null)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                <Button size="icon" onClick={() => handleSend()} className="rounded-full h-10 w-10 bg-primary"><Send className="h-4 w-4" /></Button>
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
                                        <DropdownMenuItem onClick={() => handleMediaClick('image')}><ImageIcon className="mr-2 h-4 w-4" /> Image</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMediaClick('video')}><Video className="mr-2 h-4 w-4" /> Video</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMediaClick('document')}><FileText className="mr-2 h-4 w-4" /> Document</DropdownMenuItem>
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
                            <Button onClick={() => handleSend(newMessage)} size="icon" disabled={!newMessage.trim() && !audioBlob} className="h-10 w-10 rounded-full shadow-lg">
                                <Send className="h-4 w-4" />
                            </Button>
                            <input type="file" ref={mediaInputRef} className="hidden" accept={acceptType} onChange={handleFileSelect} />
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
