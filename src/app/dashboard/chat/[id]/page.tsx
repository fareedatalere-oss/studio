
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    serverTimestamp, setDoc, updateDoc, deleteDoc, 
    getDoc, writeBatch, getDocs, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS } from '@/lib/appwrite';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, Mic, MoreVertical, UserX, Trash2, Forward, Check, Image as ImageIcon, Video, FileText, X, Play, Pause, Trash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
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
    const { user: currentUser, profile: myProfile, recheckUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isForwarding, setIsForwarding] = useState<string | null>(null);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [selectedForForward, setSelectedForForward] = useState<string[]>([]);
    
    // Media & Voice State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<any | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageMapRef = useRef<Map<string, any>>(new Map());
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

    const isBlocked = myProfile?.blockedUsers?.includes(otherUserId);
    const hasBlockedMe = otherUser?.blockedUsers?.includes(currentUser?.$id);

    // Offline Handling
    useEffect(() => {
        const handleOnline = () => {
            if (pendingMessage) {
                toast({ title: "Back Online", description: "Resending failed message..." });
                handleSend(pendingMessage.text, pendingMessage.media);
                setPendingMessage(null);
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [pendingMessage, toast]);

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const unsubOther = onSnapshot(doc(db, COLLECTION_ID_PROFILES, otherUserId), (d) => {
            if (d.exists()) setOtherUser(d.data());
        });

        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                const id = change.doc.id;
                
                if (data.deletedFor?.includes(currentUser.$id)) {
                    messageMapRef.current.delete(id);
                } else if (change.type === 'removed') {
                    messageMapRef.current.delete(id);
                } else {
                    messageMapRef.current.set(id, { $id: id, ...data });
                }
            });

            const sorted = Array.from(messageMapRef.current.values()).sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
                const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
                return timeA - timeB;
            });
            
            setMessages(sorted);

            const unread = snapshot.docs.filter(d => d.data().senderId !== currentUser.$id && d.data().status !== 'read');
            if (unread.length > 0) {
                const batch = writeBatch(db);
                unread.forEach(d => batch.update(d.ref, { status: 'read' }));
                batch.commit();
            }
        });

        return () => { unsub(); unsubOther(); };
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => {
        if (currentUser?.$id) {
            const q = query(collection(db, COLLECTION_ID_CHATS), where('participants', 'array-contains', currentUser.$id));
            const unsub = onSnapshot(q, (snap) => {
                setRecentChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [currentUser]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: any) => {
        const text = textOverride || newMessage.trim();
        if (!text && !mediaData) return;
        
        if (!navigator.onLine) {
            setPendingMessage({ text, media: mediaData });
            toast({ variant: 'destructive', title: "Network Error", description: "Waiting for connection to resend." });
            return;
        }

        if (!textOverride && !mediaData) setNewMessage('');

        const msgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
        const initialStatus = otherUser?.isOnline ? 'delivered' : 'sent';

        try {
            const payload: any = { 
                chatId, 
                senderId: currentUser.$id, 
                text: text || '', 
                status: initialStatus,
                deletedFor: [],
                createdAt: serverTimestamp()
            };

            if (mediaData) {
                payload.mediaUrl = mediaData.url;
                payload.mediaType = mediaData.type;
                if (mediaData.duration) payload.duration = mediaData.duration;
            }

            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), payload);

            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: text ? (text.length > 30 ? text.substring(0,30)+'...' : text) : `Sent a ${mediaData?.type || 'file'}`,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        }
    };

    // Voice Note Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= 3600) { // 1 Hour Limit
                        stopRecording();
                        return 3600;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (e) {
            toast({ variant: 'destructive', title: "Mic Error", description: "Could not access microphone." });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        }
    };

    const sendVoiceNote = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        toast({ title: "Uploading voice note..." });
        
        try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });

            const upload = await uploadToCloudinary(base64, 'video'); // Cloudinary treats audio as video/auto
            if (upload.success) {
                handleSend('', { url: upload.url, type: 'audio', duration: recordingDuration });
                discardVoiceNote();
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Upload Failed" });
        } finally {
            setIsUploading(false);
        }
    };

    const discardVoiceNote = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingDuration(0);
    };

    // Media Upload Logic
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Video limit: 3 minutes check
        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                if (video.duration > 180) {
                    toast({ variant: 'destructive', title: "Video too long", description: "Maximum 3 minutes allowed." });
                    return;
                }
                uploadAndSendFile(file);
            };
            video.src = URL.createObjectURL(file);
        } else {
            uploadAndSendFile(file);
        }
    };

    const uploadAndSendFile = async (file: File) => {
        setIsUploading(true);
        toast({ title: "Sending media..." });
        try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'pdf');
            const upload = await uploadToCloudinary(base64, type === 'pdf' ? 'raw' : (type === 'image' ? 'image' : 'video'));
            
            if (upload.success) {
                handleSend('', { url: upload.url, type });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Media send failed" });
        } finally {
            setIsUploading(false);
        }
    };

    const deleteMessage = async (msgId: string, forAll: boolean) => {
        try {
            if (forAll) {
                // Instead of deleting document, update it to show "deleted a message"
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), {
                    text: "deleted a message",
                    isDeleted: true,
                    mediaUrl: null,
                    mediaType: null
                });
            } else {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), {
                    deletedFor: arrayUnion(currentUser?.$id)
                });
                messageMapRef.current.delete(msgId);
                setMessages(prev => prev.filter(m => m.$id !== msgId));
            }
            toast({ title: 'Message Status Updated' });
        } catch (e) {}
    };

    const handleBlock = async () => {
        if (!currentUser) return;
        try {
            const myRef = doc(db, COLLECTION_ID_PROFILES, currentUser.$id);
            if (isBlocked) {
                await updateDoc(myRef, { blockedUsers: arrayRemove(otherUserId) });
                toast({ title: 'User Unblocked' });
            } else {
                await updateDoc(myRef, { blockedUsers: arrayUnion(otherUserId) });
                toast({ title: 'User Blocked' });
            }
            await recheckUser();
        } catch (e) {}
    };

    const deleteChatHistory = async () => {
        try {
            const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId));
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.update(d.ref, { deletedFor: arrayUnion(currentUser?.$id) }));
            await batch.commit();
            messageMapRef.current.clear();
            setMessages([]);
            toast({ title: 'History Cleared' });
        } catch (e) {}
    };

    const handleForward = async () => {
        if (!isForwarding || selectedForForward.length === 0) return;
        const msg = messages.find(m => m.$id === isForwarding);
        if (!msg) return;

        toast({ title: `Forwarding to ${selectedForForward.length} users...` });
        for (const targetId of selectedForForward) {
            const fwdChatId = getChatId(currentUser?.$id, targetId);
            const fwdMsgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
            const fwdPayload: any = {
                chatId: fwdChatId,
                senderId: currentUser?.$id,
                text: msg.text,
                status: 'sent',
                deletedFor: [],
                createdAt: serverTimestamp()
            };
            if (msg.mediaUrl) {
                fwdPayload.mediaUrl = msg.mediaUrl;
                fwdPayload.mediaType = msg.mediaType;
            }
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, fwdMsgId), fwdPayload);
        }
        setIsForwarding(null);
        setSelectedForForward([]);
        toast({ title: 'Message Forwarded' });
    };

    const getTickIcon = (status: string) => {
        switch (status) {
            case 'read': return <div className="flex gap-[-2px]"><Check className="h-2 w-2 text-green-400" /><Check className="h-2 w-2 text-green-400 -ml-1" /></div>;
            case 'delivered': return <div className="flex gap-[-2px]"><Check className="h-2 w-2 text-muted-foreground" /><Check className="h-2 w-2 text-muted-foreground -ml-1" /></div>;
            default: return <Check className="h-2 w-2 text-muted-foreground" />;
        }
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const renderMedia = (msg: any) => {
        if (msg.isDeleted) return null;
        const navigateToViewer = (type: string) => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=${type}`);

        switch (msg.mediaType) {
            case 'image':
                return (
                    <div onClick={() => navigateToViewer('image')} className="cursor-pointer mb-2 rounded-xl overflow-hidden bg-muted flex items-center justify-center p-2 border">
                        <ImageIcon className="h-10 w-10 text-primary opacity-50" />
                    </div>
                );
            case 'video':
                return (
                    <div onClick={() => navigateToViewer('video')} className="cursor-pointer mb-2 rounded-xl overflow-hidden bg-muted flex items-center justify-center p-2 border relative">
                        <Video className="h-10 w-10 text-primary opacity-50" />
                        <Play className="absolute h-4 w-4 text-white fill-white" />
                    </div>
                );
            case 'audio':
                return (
                    <div className="flex items-center gap-3 p-2 bg-muted/20 rounded-xl mb-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"><Mic className="h-4 w-4 text-white" /></div>
                        <audio src={msg.mediaUrl} controls className="h-8 w-40" />
                    </div>
                );
            case 'pdf':
                return (
                    <div onClick={() => window.open(msg.mediaUrl)} className="cursor-pointer mb-2 p-3 bg-muted/30 rounded-xl flex items-center gap-3 border border-dashed">
                        <FileText className="h-6 w-6 text-red-500" />
                        <span className="text-[10px] font-black uppercase">Document.pdf</span>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="sticky top-0 bg-background border-b flex items-center p-3 gap-3 z-50 pt-12 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/chat')} className="h-10 w-10 rounded-full bg-muted/50">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                {otherUser && (
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <Avatar className="h-11 w-11 border-2 border-primary/10 shadow-sm">
                            <AvatarImage src={otherUser.avatar} className="object-cover" />
                            <AvatarFallback className="font-black bg-primary text-white">{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <h2 className="font-black text-xs leading-none truncate uppercase tracking-tighter">@{otherUser.username}</h2>
                            <p className={cn("text-[8px] font-black uppercase mt-1.5", otherUser.isOnline ? "text-green-500 animate-pulse" : "text-muted-foreground")}>
                                {otherUser.isOnline ? 'Online Now' : otherUser.lastSeen ? `Left ${formatDistanceToNow(new Date(otherUser.lastSeen.toMillis ? otherUser.lastSeen.toMillis() : otherUser.lastSeen), { addSuffix: true })}` : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><MoreVertical className="h-5 w-5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-black uppercase text-[10px]">
                        <DropdownMenuItem onClick={handleBlock} className={isBlocked ? "text-green-600" : "text-destructive"}>
                            <UserX className="mr-2 h-4 w-4" /> {isBlocked ? 'Unblock User' : 'Block User'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={deleteChatHistory} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Clear History
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain bg-muted/5">
                <div className="max-w-xl mx-auto w-full space-y-3">
                    <div className="text-center py-6 opacity-20 flex flex-col items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <p className="text-[7px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p>
                    </div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className={cn(
                                            "p-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold leading-relaxed cursor-pointer active:scale-95 transition-transform", 
                                            isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border",
                                            msg.isDeleted && "opacity-50 italic"
                                        )}>
                                            {renderMedia(msg)}
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                <span className="text-[6px] font-black uppercase">
                                                    {msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : '...'}
                                                </span>
                                                {isMine && getTickIcon(msg.status)}
                                            </div>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-40 font-black uppercase text-[9px]">
                                        <DropdownMenuItem onClick={() => setIsForwarding(msg.$id)}>
                                            <Forward className="mr-2 h-3.5 w-3.5" /> Forward
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteMessage(msg.$id, false)}>
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me
                                        </DropdownMenuItem>
                                        {isMine && !msg.isDeleted && (
                                            <DropdownMenuItem onClick={() => deleteMessage(msg.$id, true)} className="text-destructive">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for all
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {(isBlocked || hasBlockedMe) ? (
                <footer className="p-10 border-t bg-destructive/5 text-center">
                    <p className="text-[10px] font-black uppercase text-destructive tracking-widest">
                        {isBlocked ? 'You have blocked this user' : 'This user has blocked you'}
                    </p>
                </footer>
            ) : (
                <footer className="p-4 border-t bg-background safe-area-bottom pb-8">
                    {/* Voice Recording Preview */}
                    {audioUrl && (
                        <div className="max-w-xl mx-auto mb-4 p-4 bg-muted/50 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-bottom-2">
                            <audio src={audioUrl} controls className="flex-1 h-10" />
                            <Button size="icon" variant="ghost" className="rounded-full text-destructive" onClick={discardVoiceNote}><Trash className="h-5 w-5"/></Button>
                            <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={sendVoiceNote} disabled={isUploading}>
                                {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                            </Button>
                        </div>
                    )}

                    <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-5 w-5" />
                        </Button>
                        <Input 
                            placeholder={isRecording ? "Recording voice..." : "Type text only..."} 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }}
                            disabled={isRecording}
                            className="flex-1 h-12 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" 
                        />
                        <div className="flex items-center gap-1">
                            {isRecording ? (
                                <div className="flex items-center gap-2 pr-2">
                                    <span className="text-[10px] font-black text-red-500 animate-pulse">{formatDuration(recordingDuration)}</span>
                                    <Button size="icon" variant="destructive" className="h-11 w-11 rounded-full shadow-lg" onClick={stopRecording}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted" onClick={startRecording}>
                                        <Mic className="h-5 w-5" />
                                    </Button>
                                    <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isUploading} className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">
                                        {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5 text-white" />}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" onChange={handleFileSelect} />
                </footer>
            )}

            <Dialog open={!!isForwarding} onOpenChange={(o) => !o && setIsForwarding(null)}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none bg-background">
                    <DialogHeader><DialogTitle className="text-center font-black uppercase tracking-tighter">Forward Message</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-center">Select up to 10 users</p>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {recentChats.map(chat => {
                                const id = chat.participants.find((p: string) => p !== currentUser?.$id);
                                return (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => {
                                            if (selectedForForward.includes(id)) setSelectedForForward(prev => prev.filter(i => i !== id));
                                            else if (selectedForForward.length < 10) setSelectedForForward(prev => [...prev, id]);
                                        }}
                                        className={cn("flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all", selectedForForward.includes(id) ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}
                                    >
                                        <p className="font-bold text-xs">Chat ID: {id.substring(0, 8)}...</p>
                                        {selectedForForward.includes(id) && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                );
                            })}
                        </div>
                        <Button className="w-full h-12 rounded-full font-black uppercase text-[10px]" onClick={handleForward} disabled={selectedForForward.length === 0}>
                            Send Forward ({selectedForForward.length})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
