'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { 
    collection, onSnapshot, doc, 
    serverTimestamp, setDoc, deleteDoc,
    increment, writeBatch
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, COLLECTION_ID_MEETINGS } from '@/lib/data-service';
import { 
    ArrowLeft, Send, Loader2, Paperclip, Phone, MoreVertical, Trash2, 
    FileText, Image as ImageIcon, Film, Mic, Volume2, Share2, ShieldAlert,
    Ban, Unlock, ListRestart, Search, X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

/**
 * @fileOverview Private Chat Hub v5.0.
 * FORCE: Instant Voice Drop. Messages land optimistically before cloud processing.
 * UI: Extra-Small Audio footprints. Full text visibility with forced wrapping.
 */

const getChatId = (userId1?: string, userId2?: string) => {
    if (!userId1 || !userId2) return 'invalid_chat';
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, profile: currentProfile, allUsers, globalMessages, isUserActuallyOnline } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
    const [messageToForward, setMessageToForward] = useState<any>(null);
    const [forwardSearch, setForwardSearch] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    const otherUser = useMemo(() => allUsers.find(u => u.$id === otherUserId), [allUsers, otherUserId]);
    const chatId = useMemo(() => currentUser?.$id && otherUserId ? getChatId(currentUser.$id, otherUserId) : null, [currentUser?.$id, otherUserId]);

    const isBlockedByMe = useMemo(() => currentProfile?.blockedUsers?.includes(otherUserId), [currentProfile, otherUserId]);
    const isBlockedByThem = useMemo(() => otherUser?.blockedUsers?.includes(currentUser?.$id), [otherUser, currentUser]);
    const anyBlockActive = isBlockedByMe || isBlockedByThem;

    const messages = useMemo(() => {
        if (!chatId || !globalMessages[chatId]) return [];
        return [...globalMessages[chatId]]
            .filter(m => !m.deleteFor?.includes(currentUser?.$id))
            .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
    }, [chatId, globalMessages, currentUser?.$id]);

    useEffect(() => {
        setIsMounted(true);
        if (!chatId || !currentUser) return;

        const markAsRead = async () => {
            const chatMessages = globalMessages[chatId] || [];
            const unread = chatMessages.filter(m => m.senderId === otherUserId && m.status !== 'read');
            
            if (unread.length > 0) {
                const batch = writeBatch(db);
                unread.forEach(m => batch.update(doc(db, COLLECTION_ID_MESSAGES, m.$id), { status: 'read' }));
                await batch.commit().catch(() => {});
            }
            
            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), { 
                [`unreadCount.${currentUser.$id}`]: 0 
            }, { merge: true }).catch(() => {});
        };
        markAsRead();
    }, [chatId, currentUser, otherUserId, globalMessages]);

    useEffect(() => { 
        if (isMounted) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMounted]);

    const handleSend = async (textOverride?: string, mediaData?: any, targetId?: string) => {
        if (!chatId || !currentUser || !currentProfile) return;
        if (anyBlockActive) return;

        const text = textOverride ?? newMessage.trim();
        if (!text && !mediaData) return;
        
        const destinationChatId = targetId ? getChatId(currentUser.$id, targetId) : chatId;
        const destinationOtherId = targetId || otherUserId;

        try {
            const msgId = ID.unique();
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId: destinationChatId, 
                senderId: currentUser.$id, 
                text: text || '', 
                status: 'sent', 
                createdAt: serverTimestamp(),
                timestamp: Date.now(), 
                deleteFor: [],
                ...(mediaData && { mediaUrl: mediaData.url, mediaType: mediaData.type })
            });

            await setDoc(doc(db, COLLECTION_ID_CHATS, destinationChatId), {
                participants: [currentUser.$id, destinationOtherId],
                lastMessage: text ? text : `Shared a ${mediaData?.type}`,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${destinationOtherId}`]: increment(1)
            }, { merge: true });

            if (!targetId) {
                setNewMessage('');
                setRecordedUrl(null);
                setRecordedBlob(null);
            }
        } catch (e) {}
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordedUrl(null);
            setRecordingDuration(0);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setRecordedBlob(blob);
                setRecordedUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= 240) { stopRecording(); return 240; }
                    return prev + 1;
                });
            }, 1000);
        } catch (e) {}
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const sendVoiceNote = async () => {
        if (!recordedBlob || !currentUser) return;
        
        // INSTANT DROP FORCE: Clear the preview instantly so it feels fast
        const tempBlobUrl = recordedUrl;
        setRecordedUrl(null);
        setRecordedBlob(null);
        setIsUploading(true);

        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(recordedBlob);
            });
            const res = await uploadToCloudinary(base64, 'video');
            if (res.success) {
                await handleSend('', { url: res.url, type: 'audio' });
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        setIsUploading(true);
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
        } finally { setIsUploading(false); }
    };

    const safeFormatTime = (ts: any) => {
        if (!ts) return format(new Date(), 'HH:mm');
        try {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return isNaN(d.getTime()) ? format(new Date(), 'HH:mm') : format(d, 'HH:mm');
        } catch (e) { return format(new Date(), 'HH:mm'); }
    };

    const MediaIcon = ({ type, url }: { type: string, url: string }) => {
        const viewMedia = () => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(url)}&type=${type}`);
        switch (type) {
            case 'image': return <div onClick={viewMedia} className="relative h-24 w-24 rounded-xl overflow-hidden border cursor-pointer shadow-sm"><img src={url} className="object-cover h-full w-full" alt="img"/></div>;
            case 'video': return <div onClick={viewMedia} className="relative h-24 w-24 rounded-xl overflow-hidden border bg-black flex items-center justify-center cursor-pointer shadow-sm"><Film className="text-white h-6 w-6" /></div>;
            case 'audio': return (
                <div className="flex flex-col gap-1 min-w-[120px] p-0.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Volume2 className="h-3 w-3 text-primary" />
                        <span className="text-[8px] font-black uppercase text-primary tracking-tighter">Audio</span>
                    </div>
                    <audio controls src={url} className="h-6 w-full scale-90 -ml-2" />
                </div>
            );
            default: return <div onClick={viewMedia} className="h-10 w-40 rounded-xl bg-muted flex items-center px-4 gap-2 cursor-pointer border"><FileText className="h-4 w-4" /><span className="text-[9px] font-black uppercase truncate">File</span></div>;
        }
    };

    if (!isMounted) return null;

    const filteredForwardUsers = allUsers.filter(u => u.$id !== currentUser?.$id && u.username?.toLowerCase().includes(forwardSearch.toLowerCase()));
    const online = otherUser && isUserActuallyOnline(otherUser);

    return (
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center p-3 gap-2 z-50 pt-12">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-8 w-8 rounded-full bg-muted/50"><ArrowLeft className="h-4 w-4" /></Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/5 shadow-sm">
                            <AvatarImage src={otherUser.avatar}/><AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <h2 className="font-black text-xs truncate">@{otherUser.username}</h2>
                            <p className={cn("text-[7px] font-black uppercase", online ? "text-green-500" : "text-muted-foreground")}>{online ? 'Online' : 'Offline'}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <Button onClick={async () => {
                        if (!currentUser || !otherUserId) return;
                        const mid = doc(collection(db, COLLECTION_ID_MEETINGS)).id;
                        await setDoc(doc(db, COLLECTION_ID_MEETINGS, mid), { hostId: currentUser.$id, invitedUsers: [otherUserId], status: 'pending', type: 'private_call', activeMode: 'audio', createdAt: serverTimestamp(), timestamp: Date.now() });
                        router.push(`/dashboard/chat/call/${mid}`);
                    }} variant="ghost" size="icon" className="text-primary h-9 w-9 rounded-full bg-primary/5"><Phone className="h-4 w-4" /></Button>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 font-black uppercase text-[10px] rounded-2xl p-2 shadow-2xl"><DropdownMenuItem className="gap-2 text-destructive"><Ban className="h-4 w-4" /> Block Account</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
            </header>
            
            <main className="flex-1 p-4 space-y-4 bg-muted/5 pb-32 overflow-y-auto scrollbar-hide">
                <div className="max-w-xl mx-auto w-full space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[75%]", msg.senderId === currentUser?.$id ? "ml-auto items-end" : "items-start")}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className={cn(
                                        "p-3 px-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold cursor-pointer break-all whitespace-pre-wrap leading-relaxed", 
                                        msg.senderId === currentUser?.$id ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border"
                                    )}>
                                        {msg.mediaUrl ? <MediaIcon type={msg.mediaType} url={msg.mediaUrl} /> : <p>{msg.text}</p>}
                                        <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                            <span className="text-[5px] font-black uppercase">{safeFormatTime(msg.timestamp || msg.createdAt)}</span>
                                            {msg.senderId === currentUser?.$id && <span className="text-[8px] ml-1">{msg.status === 'read' ? '✅' : '☑️'}</span>}
                                        </div>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={msg.senderId === currentUser?.$id ? 'end' : 'start'} className="font-black uppercase text-[9px] w-32 rounded-xl p-1">
                                    <DropdownMenuItem onClick={() => { setMessageToForward(msg); setForwardDialogOpen(true); }} className="gap-2"><Share2 className="h-3 w-3" /> Forward</DropdownMenuItem>
                                    <DropdownMenuSeparator /><DropdownMenuItem onClick={() => deleteDoc(doc(db, COLLECTION_ID_MESSAGES, msg.$id))} className="gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete Permanently</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-2 border-t bg-background pb-8 z-[60] shadow-2xl">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    {recordedUrl ? (
                        <div className="flex-1 flex items-center gap-2 bg-muted/30 p-1 rounded-full border border-primary/10 overflow-hidden">
                            <Button variant="ghost" size="icon" onClick={() => { setRecordedUrl(null); setRecordedBlob(null); }} className="h-7 w-7 rounded-full text-destructive shrink-0"><X className="h-4 w-4"/></Button>
                            <audio src={recordedUrl} controls className="h-7 flex-1 scale-90" />
                            <Button onClick={sendVoiceNote} size="icon" className="h-9 w-9 rounded-full shadow-lg bg-primary shrink-0" disabled={isUploading}>{isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4 text-white" />}</Button>
                        </div>
                    ) : isRecording ? (
                        <div className="flex-1 h-9 bg-red-50 text-red-600 rounded-full flex items-center px-4 gap-3 animate-pulse border border-red-100">
                            <div className="h-2 w-2 bg-red-600 rounded-full"></div>
                            <span className="font-black text-[10px] uppercase">{format(recordingDuration * 1000, 'mm:ss')}</span>
                            <Button onClick={stopRecording} variant="ghost" size="sm" className="ml-auto font-black uppercase text-[8px] text-red-600 h-7">Stop Preview</Button>
                        </div>
                    ) : (
                        <>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted/50"><Paperclip className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-40 rounded-2xl p-2 font-black uppercase text-[9px] shadow-2xl"><DropdownMenuItem onClick={() => { fileInputRef.current?.click(); }} className="gap-2"><ImageIcon className="h-4 w-4" /> Image</DropdownMenuItem><DropdownMenuItem onClick={() => { fileInputRef.current?.click(); }} className="gap-2"><Film className="h-4 w-4" /> Video</DropdownMenuItem><DropdownMenuItem onClick={() => { fileInputRef.current?.click(); }} className="gap-2"><FileText className="h-4 w-4" /> Document</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                            <Input placeholder="Message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} className="flex-1 h-9 rounded-full bg-muted/50 border-none px-4 text-xs font-bold focus-visible:ring-1 focus-visible:ring-primary shadow-inner" />
                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            {!newMessage.trim() ? (
                                <Button onClick={startRecording} size="icon" className="h-9 w-9 rounded-full bg-primary shadow-lg"><Mic className="h-4 w-4 text-white" /></Button>
                            ) : (
                                <Button onClick={() => handleSend()} size="icon" className="h-9 w-9 rounded-full bg-primary shadow-xl"><Send className="h-4 w-4 text-white" /></Button>
                            )}
                        </>
                    )}
                </div>
            </footer>

            <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}><DialogContent className="max-w-md w-[90%] rounded-[2rem] p-6 border-none shadow-2xl"><DialogHeader><DialogTitle className="text-center font-black uppercase tracking-tighter text-sm">Forward Message</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" /><Input placeholder="Search..." className="pl-10 h-10 rounded-xl bg-muted border-none" value={forwardSearch} onChange={e => setForwardSearch(e.target.value)} /></div><ScrollArea className="h-64 pr-2"><div className="space-y-2">{filteredForwardUsers.map(u => (<div key={u.$id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => handleSend(messageToForward?.text, messageToForward?.mediaUrl ? { url: messageToForward.mediaUrl, type: messageToForward.mediaType } : undefined, u.$id)}><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={u.avatar}/><AvatarFallback>{u.username?.charAt(0)}</AvatarFallback></Avatar><p className="font-bold text-xs">@{u.username}</p></div><Share2 className="h-4 w-4 text-primary" /></div>))}</div></ScrollArea></div></DialogContent></Dialog>
        </div>
    );
}