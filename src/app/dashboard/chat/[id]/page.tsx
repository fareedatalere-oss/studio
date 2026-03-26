
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import client, { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, getAppwriteStorageUrl, storage, BUCKET_ID_UPLOADS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Models, ID, Query } from 'appwrite';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, PlayCircle, Trash2, Play, Pause, Forward } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const getChatId = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0].substring(0, 15)}_${sortedIds[1].substring(0, 15)}`;
};

const VoiceNotePlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const handleTimeUpdate = () => { if (audioRef.current) setProgress(audioRef.current.currentTime / audioRef.current.duration); };
    const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };
    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current) {
            const scrubTime = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * duration;
            audioRef.current.currentTime = scrubTime;
        }
    };
    useEffect(() => {
        const audio = audioRef.current;
        const handleEnded = () => setIsPlaying(false);
        audio?.addEventListener('ended', handleEnded);
        return () => audio?.removeEventListener('ended', handleEnded);
    }, []);

    return (
        <div className="flex items-center gap-2 w-full max-w-[250px]">
            <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={togglePlay}>{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
            <div className="flex-1 flex items-center gap-2">
                 <div className="relative w-full h-1.5 bg-muted rounded-full cursor-pointer" onClick={handleScrub}>
                    <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${progress * 100}%`}} />
                     <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full" style={{ left: `calc(${progress * 100}% - 6px)`}} />
                </div>
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
    const [messages, setMessages] = useState<Models.Document[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [messageToForward, setMessageToForward] = useState<Models.Document | null>(null);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [loadingRecentChats, setLoadingRecentChats] = useState(false);

    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;
    
    const markMessagesAsRead = useCallback(async () => {
        if (!chatId || !currentUser) return;
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                Query.equal('chatId', chatId),
                Query.notEqual('senderId', currentUser.$id),
                Query.equal('status', 'sent')
            ]);
            if (response.documents.length > 0) {
                await Promise.all(response.documents.map(msg => databases.updateDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, msg.$id, { status: 'read' })));
            }
        } catch (e) {}
    }, [chatId, currentUser]);

    useEffect(() => {
        if (!chatId) return;
        const topic = `databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`;
        const unsubscribe = client.subscribe([topic], (response) => {
            const payload = response.payload as Models.Document;
            if (payload.chatId === chatId) {
                const events = response.events || [];
                if (events.some(e => e.includes('.create'))) {
                    setMessages((prev) => prev.some(m => m.$id === payload.$id) ? prev : [...prev, payload]);
                    if (payload.senderId !== currentUser?.$id) markMessagesAsRead();
                } else if (events.some(e => e.includes('.delete'))) {
                    setMessages((prev) => prev.filter(m => m.$id !== payload.$id));
                } else if (events.some(e => e.includes('.update'))) {
                    setMessages((prev) => prev.map(m => m.$id === payload.$id ? payload : m));
                }
            }
        });
        return () => unsubscribe();
    }, [chatId, currentUser?.$id, markMessagesAsRead]);

    useEffect(() => {
        const setupChat = async () => {
            if (!chatId) return;
            setLoading(true);
            try {
                const other = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                setOtherUser(other);
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                    Query.equal('chatId', chatId),
                    Query.orderAsc('$createdAt'),
                    Query.limit(100) 
                ]);
                setMessages(response.documents);
                markMessagesAsRead();
            } catch (error: any) {
                toast({ title: 'Error', description: `Could not load chat.`, variant: 'destructive' });
            } finally { setLoading(false); }
        };
        if (chatId && otherUserId) setupChat();
    }, [chatId, otherUserId, toast, markMessagesAsRead]);

    useEffect(() => {
        if (!!messageToForward && currentUser) {
            const fetchRecent = async () => {
                setLoadingRecentChats(true);
                try {
                    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
                        Query.contains('participants', currentUser.$id),
                        Query.orderDesc('lastMessageAt'),
                        Query.limit(10)
                    ]);
                    const withProfiles = await Promise.all(res.documents.map(async (chat) => {
                        const otherId = chat.participants.find((p: string) => p !== currentUser.$id);
                        const otherProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherId);
                        return { ...chat, otherUser: otherProfile };
                    }));
                    setRecentChats(withProfiles);
                } catch (e) {} finally { setLoadingRecentChats(false); }
            };
            fetchRecent();
        }
    }, [messageToForward, currentUser]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (recordingStatus === 'recording') interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        else setRecordingTime(0);
        return () => clearInterval(interval);
    }, [recordingStatus]);

    const updateChatList = async (lastMessage: string) => {
        if (!currentUser || !chatId) return;
        const data = { participants: [currentUser.$id, otherUserId], lastMessage, lastMessageAt: new Date().toISOString() };
        try { await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, data); } 
        catch (e: any) { if (e.code === 404) await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, data); }
    };

    const triggerMessageNotification = async (text: string) => {
        if (!currentUser || !otherUserId) return;
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
                userId: otherUserId, senderId: currentUser.$id, type: 'message',
                title: 'New Message', description: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                isRead: false, link: `/dashboard/chat/${currentUser.$id}`, createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to trigger notification doc:", e);
        }
    };

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chatId) return;
        setSending(true);
        const text = newMessage.trim();
        setNewMessage('');
        const tempId = ID.unique();
        const optimistic = { $id: tempId, chatId, senderId: currentUser.$id, text, status: 'sent', $createdAt: new Date().toISOString() } as Models.Document;
        setMessages(prev => [...prev, optimistic]);
        try {
            const final = await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, tempId, { chatId, senderId: currentUser.$id, text, status: 'sent' });
            setMessages(prev => prev.map(m => m.$id === tempId ? final : m));
            await updateChatList(text);
            await triggerMessageNotification(text);
        } catch (error: any) {
            setMessages(prev => prev.filter(m => m.$id !== tempId));
            setNewMessage(text);
        } finally { setSending(false); }
    };
    
    const handleSendMediaMessage = async (file: File) => {
        if (!file || !currentUser || !chatId) return;
        setSending(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const mediaUrl = getAppwriteStorageUrl(upload.$id);
            const typeLabel = file.type.startsWith('image/') ? 'Image' : file.type.startsWith('video/') ? 'Video' : 'Audio';
            const final = await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), { chatId, senderId: currentUser.$id, mediaUrl, text: `[media:${file.type}]`, status: 'sent' });
            setMessages(prev => [...prev, final]);
            await updateChatList(`[${typeLabel}] Sent a ${typeLabel.toLowerCase()}`);
            await triggerMessageNotification(`Sent a ${typeLabel.toLowerCase()}`);
        } catch (error: any) { toast({ title: 'Error', description: 'Media failed to send.', variant: 'destructive' }); } 
        finally { setSending(false); }
    };
    
    const handleMediaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) handleSendMediaMessage(e.target.files[0]);
        e.target.value = '';
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioPreviewUrl(URL.createObjectURL(blob));
                setRecordingStatus('preview');
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            setRecordingStatus('recording');
        } catch (e) { toast({ variant: 'destructive', title: 'Mic Access Denied' }); }
    };

    const stopRecording = () => mediaRecorder?.stop();
    const cancelRecording = () => { if (mediaRecorder) mediaRecorder.stream.getTracks().forEach(t => t.stop()); setRecordingStatus('idle'); };
    const handleSendAudio = () => {
        if (audioBlob) {
            handleSendMediaMessage(new File([audioBlob], `voice-note.webm`, { type: 'audio/webm' }));
            setRecordingStatus('idle'); setAudioPreviewUrl(null); setAudioBlob(null);
        }
    };

    const handleDeleteMessage = async (id: string) => {
        try { await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, id); setMessages(prev => prev.filter(m => m.$id !== id)); } 
        catch (e) {}
    };

    const handleSendForward = async (targetId: string) => {
        if (!messageToForward || !currentUser) return;
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), { chatId: targetId, senderId: currentUser.$id, text: `[Forwarded] ${messageToForward.text}`, mediaUrl: messageToForward.mediaUrl || null, status: 'sent' });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, targetId, { lastMessage: `[Forwarded] ${messageToForward.text || 'Media'}`, lastMessageAt: new Date().toISOString() });
            toast({ title: 'Forwarded' });
        } catch (e) {} finally { setMessageToForward(null); }
    };

    const renderMessageContent = (message: Models.Document) => {
        const text = message.text || '';
        if (message.mediaUrl && text.startsWith('[media:')) {
            const mediaType = text.slice(7, -1);
            if (mediaType.startsWith('image/')) return (
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative w-full max-w-[250px] aspect-square cursor-pointer bg-muted rounded-lg overflow-hidden">
                            <Image src={message.mediaUrl} alt="chat" fill className="object-cover" />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 bg-black/80 w-screen h-screen max-w-none max-h-none flex items-center justify-center">
                        <DialogTitle className="sr-only">Preview</DialogTitle>
                        <Image src={message.mediaUrl} alt="preview" fill className="object-contain" />
                    </DialogContent>
                </Dialog>
            );
            if (mediaType.startsWith('video/')) return (
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative w-full max-w-[250px] aspect-video cursor-pointer bg-black rounded-lg flex items-center justify-center">
                            <PlayCircle className="h-16 w-16 text-white" />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 bg-black/90 w-screen h-screen max-w-none max-h-none flex items-center justify-center">
                        <DialogTitle className="sr-only">Preview</DialogTitle>
                        <video src={message.mediaUrl} controls autoPlay className="max-w-full max-h-full" />
                    </DialogContent>
                </Dialog>
            );
            if (mediaType.startsWith('audio/')) return <VoiceNotePlayer src={message.mediaUrl} />;
        }
        return text && !text.startsWith('[media:') ? <p className="text-sm whitespace-pre-wrap">{text}</p> : null;
    };

    return (
        <div className="flex flex-col h-full bg-white text-gray-900">
            <header className="sticky top-16 md:top-0 bg-white border-b flex items-center p-3 gap-3 z-10 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                {otherUser ? (
                    <>
                        <Avatar className="h-10 w-10 border border-primary/20">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-bold text-sm leading-none">{otherUser.username}</h2>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest animate-pulse">Syncing...</span>
                    </div>
                )}
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-50/50">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.$id} className={cn("group flex items-end gap-2 max-w-[85%] md:max-w-[70%]", msg.senderId === currentUser?.$id ? "ml-auto flex-row-reverse" : "mr-auto")}>
                            <div className={cn("p-3 rounded-2xl shadow-sm", msg.senderId === currentUser?.$id ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white border rounded-bl-none")}>
                                {renderMessageContent(msg)}
                                <div className={cn("text-[9px] mt-1 opacity-70 flex justify-end", msg.senderId === currentUser?.$id ? "text-primary-foreground font-bold" : "text-muted-foreground")}>
                                    {format(new Date(msg.$createdAt), 'HH:mm')}
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setMessageToForward(msg)}>
                                            <Forward className="mr-2 h-4 w-4" /> Forward
                                        </DropdownMenuItem>
                                        {msg.senderId === currentUser?.$id && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete message?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteMessage(msg.$id)} className="bg-destructive">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="sticky bottom-16 md:bottom-0 bg-white border-t p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                {recordingStatus === 'recording' ? (
                    <div className="flex items-center w-full gap-2">
                        <Button type="button" variant="ghost" size="icon" onClick={cancelRecording}>
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                        <div className="flex-1 bg-muted rounded-full h-10 flex items-center px-4">
                            <div className="bg-red-500 h-2.5 w-2.5 rounded-full animate-pulse mr-2"></div>
                            <span className="text-sm font-mono text-muted-foreground">
                                {Math.floor(recordingTime/60).toString().padStart(2,'0')}:{(recordingTime%60).toString().padStart(2,'0')}
                            </span>
                        </div>
                        <Button type="button" size="icon" onClick={stopRecording}><Send className="h-5 w-5" /></Button>
                    </div>
                ) : recordingStatus === 'preview' ? (
                     <div className="flex items-center w-full gap-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => {setRecordingStatus('idle'); setAudioPreviewUrl(null);}}>
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                        <audio src={audioPreviewUrl!} controls className="flex-1 h-10" />
                        <Button type="button" size="icon" onClick={handleSendAudio} disabled={sending}>
                            {sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
                        <Input type="text" placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={sending} className="h-11 bg-neutral-100 border-none rounded-full px-4" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => mediaInputRef.current?.click()} disabled={sending} className="h-11 w-11 rounded-full">
                            <Paperclip className="h-5 w-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={startRecording} disabled={sending} className="h-11 w-11 rounded-full">
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="h-11 w-11 rounded-full shadow-md">
                            {sending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                )}
            </footer>

            <input type="file" key={sending ? 'sending' : 'ready'} ref={mediaInputRef} onChange={handleMediaInputChange} className="hidden" accept="image/*,video/*" />
            
            <Sheet open={!!messageToForward} onOpenChange={o => !o && setMessageToForward(null)}>
                <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                    <SheetHeader>
                        <SheetTitle className="text-center font-black uppercase text-sm">Forward to...</SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-2 overflow-y-auto h-full">
                        {loadingRecentChats ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : (
                            recentChats.map((chat) => (
                                <div key={chat.$id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={chat.otherUser?.avatar} />
                                            <AvatarFallback>{chat.otherUser?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold">{chat.otherUser?.username}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleSendForward(chat.$id)} className="rounded-full">
                                        <Send className="h-3 w-3 mr-2" />Send
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
