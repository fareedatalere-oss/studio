
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
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, Phone, MoreVertical, Trash2, Forward, FileText, Image as ImageIcon, Film, Music, Mic, X, Download } from 'lucide-react';
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
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaTypeRef = useRef<'image' | 'video' | 'audio' | 'raw'>('image');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        // 4 Minute Limit Force
        if (file.type.startsWith('video') || file.type.startsWith('audio')) {
            const video = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 240) {
                    toast({ variant: 'destructive', title: 'File Too Long', description: 'Maximum duration is 4 minutes.' });
                    return;
                }
                startUpload(file);
            };
            video.src = URL.createObjectURL(file);
        } else {
            startUpload(file);
        }
    };

    const startUpload = async (file: File) => {
        setIsUploading(true);
        toast({ title: 'Sharing Media...' });
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const res = await uploadToCloudinary(base64, file.type.startsWith('image') ? 'image' : 'video');
            if (res.success) {
                let type: any = 'document';
                if (file.type.startsWith('image')) type = 'image';
                else if (file.type.startsWith('video')) type = 'video';
                else if (file.type.startsWith('audio')) type = 'audio';

                handleSend('', { url: res.url, type });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingDuration(0);
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    const res = await uploadToCloudinary(base64, 'video');
                    if (res.success) handleSend('', { url: res.url, type: 'audio' });
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= 240) { stopRecording(); return 240; }
                    return prev + 1;
                });
            }, 1000);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Microphone Denied' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const handleInitiateCall = () => {
        router.push(`/dashboard/chat/call/${otherUserId}`);
    };

    const MessageStatus = ({ msg }: { msg: any }) => {
        if (msg.senderId !== currentUser?.$id) return null;
        if (msg.status === 'read') return <span className="text-green-500 ml-1">✅</span>;
        if (otherUser?.isOnline) return <span className="text-muted-foreground ml-1">☑️ ☑️</span>;
        return <span className="text-muted-foreground ml-1">☑️</span>;
    };

    const MediaIcon = ({ type, url }: { type: string, url: string }) => {
        const viewMedia = () => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(url)}&type=${type}`);
        
        switch (type) {
            case 'image': return <div onClick={viewMedia} className="relative h-32 w-32 rounded-lg overflow-hidden border cursor-pointer"><img src={url} className="object-cover h-full w-full" alt="img"/></div>;
            case 'video': return <div onClick={viewMedia} className="relative h-32 w-32 rounded-lg overflow-hidden border bg-black flex items-center justify-center cursor-pointer"><Film className="text-white h-8 w-8" /></div>;
            case 'audio': return <div onClick={viewMedia} className="h-10 w-40 rounded-full bg-primary/20 flex items-center px-4 gap-2 cursor-pointer"><Music className="h-4 w-4 text-primary" /><span className="text-[9px] font-black uppercase">Voice Note</span></div>;
            default: return <div onClick={viewMedia} className="h-10 w-40 rounded-xl bg-muted flex items-center px-4 gap-2 cursor-pointer"><FileText className="h-4 w-4" /><span className="text-[9px] font-black uppercase truncate">Document</span></div>;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background font-body">
            <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center p-3 gap-2 z-50 pt-12">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-8 w-8 rounded-full bg-muted/50"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/5">
                            <AvatarImage src={otherUser.avatar}/>
                            <AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-black text-xs">@{otherUser.username}</h2>
                            <p className={cn("text-[7px] font-black uppercase", otherUser.isOnline ? "text-green-500" : "text-muted-foreground")}>
                                {otherUser.isOnline ? 'Online' : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <Button onClick={handleInitiateCall} variant="ghost" size="icon" className="text-primary h-9 w-9 rounded-full bg-primary/5"><Phone className="h-4 w-4" /></Button>
            </header>
            
            <main className="flex-1 p-4 space-y-4 bg-muted/5 pb-32 overflow-y-auto">
                <div className="max-w-xl mx-auto w-full space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", msg.senderId === currentUser?.$id ? "ml-auto items-end" : "items-start")}>
                            <div className={cn("p-3 px-4 rounded-[1.5rem] shadow-sm relative text-[11px] font-bold", msg.senderId === currentUser?.$id ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border")}>
                                {msg.mediaUrl ? (
                                    <MediaIcon type={msg.mediaType} url={msg.mediaUrl} />
                                ) : (
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                )}
                                <div className="flex items-center justify-end gap-1 mt-1.5 opacity-60">
                                    <span className="text-[5px] font-black uppercase">{msg.timestamp ? format(msg.timestamp, 'HH:mm') : ''}</span>
                                    <MessageStatus msg={msg} />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background pb-10 z-50">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-muted/50"><Paperclip className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 rounded-2xl p-2 font-black uppercase text-[9px]">
                            <DropdownMenuItem onClick={() => { mediaTypeRef.current = 'image'; fileInputRef.current?.click(); }} className="gap-2"><ImageIcon className="h-4 w-4" /> Image</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { mediaTypeRef.current = 'video'; fileInputRef.current?.click(); }} className="gap-2"><Film className="h-4 w-4" /> Video</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { mediaTypeRef.current = 'raw'; fileInputRef.current?.click(); }} className="gap-2"><FileText className="h-4 w-4" /> Document</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {isRecording ? (
                        <div className="flex-1 h-11 bg-red-50 text-red-600 rounded-full flex items-center px-6 gap-3 animate-pulse">
                            <div className="h-2 w-2 bg-red-600 rounded-full"></div>
                            <span className="font-black text-xs uppercase tracking-widest">{format(recordingDuration * 1000, 'mm:ss')}</span>
                            <Button onClick={stopRecording} variant="ghost" size="sm" className="ml-auto font-black uppercase text-[9px] text-red-600 hover:bg-transparent">Stop & Send</Button>
                        </div>
                    ) : (
                        <Input 
                            placeholder="Message..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                            className="flex-1 h-11 rounded-full bg-muted/50 border-none px-6 text-xs font-bold focus-visible:ring-1 focus-visible:ring-primary" 
                        />
                    )}

                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    
                    {!newMessage.trim() && !isRecording ? (
                        <Button onClick={startRecording} size="icon" className="h-11 w-11 rounded-full bg-primary"><Mic className="h-5 w-5 text-white" /></Button>
                    ) : (
                        <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() && !isRecording} className="h-11 w-11 rounded-full bg-primary shadow-lg"><Send className="h-4 w-4 text-white" /></Button>
                    )}
                </div>
            </footer>
        </div>
    );
}
