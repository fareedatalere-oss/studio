
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { db } from '@/lib/firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    serverTimestamp, setDoc, updateDoc, 
    writeBatch, arrayUnion, increment 
} from 'firebase/firestore';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, databases, DATABASE_ID, ID } from '@/lib/appwrite';
import { ArrowLeft, Send, ShieldCheck, Loader2, Paperclip, MoreVertical, UserX, Trash2, Forward, Check, Image as ImageIcon, Video, FileText, X, Play, Phone } from 'lucide-react';
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
    const { user: currentUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isForwarding, setIsForwarding] = useState<string | null>(null);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [selectedForForward, setSelectedForForward] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageMapRef = useRef<Map<string, any>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeMediaType, setActiveMediaType] = useState<'image' | 'video' | 'pdf' | null>(null);
    
    const chatId = useMemo(() => {
        if (!currentUser?.$id || !otherUserId) return null;
        return getChatId(currentUser.$id, otherUserId);
    }, [currentUser?.$id, otherUserId]);

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
                if (data.deletedFor?.includes(currentUser.$id)) messageMapRef.current.delete(id);
                else messageMapRef.current.set(id, { $id: id, ...data });
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
            const unsub = onSnapshot(q, (snap) => setRecentChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsub();
        }
    }, [currentUser]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: any) => {
        const text = textOverride || newMessage.trim();
        if (!text && !mediaData) return;
        if (!textOverride && !mediaData) setNewMessage('');

        const msgId = doc(collection(db, COLLECTION_ID_MESSAGES)).id;
        try {
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { 
                chatId, senderId: currentUser.$id, text: text || '', 
                status: otherUser?.isOnline ? 'delivered' : 'sent',
                deletedFor: [], createdAt: serverTimestamp(),
                ...(mediaData && { mediaUrl: mediaData.url, mediaType: mediaData.type, duration: mediaData.duration })
            });
            await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
                participants: [currentUser.$id, otherUserId],
                lastMessage: text ? (text.length > 30 ? text.substring(0,30)+'...' : text) : `Sent a ${mediaData?.type || 'file'}`,
                lastMessageAt: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: increment(1)
            }, { merge: true });
        } catch (e) { toast({ variant: 'destructive', title: 'Error sending message' }); }
    };

    const handleStartCall = async () => {
        if (!currentUser || !otherUserId) return;
        const callId = ID.unique();
        try {
            await databases.createDocument(DATABASE_ID, 'meetings', callId, {
                hostId: currentUser.$id,
                type: 'call',
                name: 'Private Call',
                status: 'pending',
                invitedUsers: [otherUserId],
                createdAt: new Date().toISOString()
            });
            router.push(`/dashboard/chat/call/${callId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Call Failed' });
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file); });
            const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'raw');
            const upload = await uploadToCloudinary(base64, type === 'raw' ? 'raw' : (type === 'image' ? 'image' : 'video'));
            if (upload.success) handleSend('', { url: upload.url, type: type === 'raw' ? 'pdf' : type });
        } catch (e) { toast({ variant: 'destructive', title: "Media send failed" }); } finally { setIsUploading(false); setActiveMediaType(null); }
    };

    const deleteMessage = async (msgId: string, forAll: boolean) => {
        try {
            if (forAll) await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { text: "deleted a message", isDeleted: true, mediaUrl: null, mediaType: null });
            else {
                await updateDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), { deletedFor: arrayUnion(currentUser.$id) });
                messageMapRef.current.delete(msgId);
                setMessages(prev => prev.filter(m => m.$id !== msgId));
            }
        } catch (e) {}
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
                                {otherUser.isOnline ? 'Online Now' : otherUser.lastSeen ? `Left ${formatDistanceToNow(new Date(otherUser.lastSeen.toMillis ? otherUser.lastSeen.toMillis() : otherUser.lastSeen), { addSuffix: true })}` : 'Offline'}
                            </p>
                        </div>
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-black uppercase text-[10px]">
                        <DropdownMenuItem onClick={() => updateDoc(doc(db, COLLECTION_ID_PROFILES, currentUser.$id), { blockedUsers: arrayUnion(otherUserId) })} className="text-destructive"><UserX className="mr-2 h-4 w-4" /> Block User</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/dashboard/chat')}><Trash2 className="mr-2 h-4 w-4" /> Clear History</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain bg-muted/5">
                <div className="max-w-xl mx-auto w-full space-y-3">
                    <div className="text-center py-6 opacity-20 flex flex-col items-center gap-2"><ShieldCheck className="h-4 w-4" /><p className="text-[7px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p></div>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?.$id;
                        return (
                            <div key={msg.$id} className={cn("flex flex-col gap-1 max-w-[85%]", isMine ? "ml-auto items-end" : "items-start")}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className={cn("p-4 rounded-[1.5rem] shadow-sm relative text-sm font-bold leading-relaxed cursor-pointer active:scale-95 transition-transform", isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border", msg.isDeleted && "opacity-50 italic")}>
                                            {msg.mediaType === 'image' && <div onClick={() => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=image`)} className="cursor-pointer mb-2 rounded-xl overflow-hidden bg-muted border p-2"><ImageIcon className="h-10 w-10 text-primary opacity-50" /></div>}
                                            {msg.mediaType === 'video' && <div onClick={() => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=video`)} className="cursor-pointer mb-2 rounded-xl overflow-hidden bg-muted border p-2 relative"><Video className="h-10 w-10 text-primary opacity-50" /><Play className="absolute h-4 w-4 text-white fill-white" /></div>}
                                            {msg.mediaType === 'pdf' && <div onClick={() => window.open(msg.mediaUrl)} className="cursor-pointer mb-2 p-3 bg-muted/30 rounded-xl flex items-center gap-3 border border-dashed"><FileText className="h-6 w-6 text-red-500" /><span className="text-[10px] font-black uppercase">Document.pdf</span></div>}
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                <span className="text-[6px] font-black uppercase">{msg.createdAt?.toMillis ? format(msg.createdAt.toMillis(), 'HH:mm') : '...'}</span>
                                                {isMine && (msg.status === 'read' ? <div className="flex"><Check className="h-2 w-2 text-green-400" /><Check className="h-2 w-2 text-green-400 -ml-1" /></div> : <Check className={cn("h-2 w-2", msg.status === 'delivered' ? 'text-blue-400' : 'text-muted-foreground')} />)}
                                            </div>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-40 font-black uppercase text-[9px]">
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/chat/view-media?url=${encodeURIComponent(msg.mediaUrl)}&type=${msg.mediaType}`)} disabled={!msg.mediaUrl}>View</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsForwarding(msg.$id)}><Forward className="mr-2 h-3.5 w-3.5" /> Forward</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteMessage(msg.$id, false)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me</DropdownMenuItem>
                                        {isMine && !msg.isDeleted && <DropdownMenuItem onClick={() => deleteMessage(msg.$id, true)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for both</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            <footer className="p-4 border-t bg-background safe-area-bottom pb-8">
                <div className="max-w-xl mx-auto w-full flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-muted"><Paperclip className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 font-black uppercase text-[10px]">
                            <DropdownMenuItem onClick={() => { setActiveMediaType('image'); fileInputRef.current?.click(); }}><ImageIcon className="mr-2 h-4 w-4" /> Image</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setActiveMediaType('video'); fileInputRef.current?.click(); }}><Video className="mr-2 h-4 w-4" /> Video</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setActiveMediaType('pdf'); fileInputRef.current?.click(); }}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button variant="ghost" size="icon" onClick={handleStartCall} className="h-11 w-11 rounded-full text-primary hover:bg-primary/10">
                        <Phone className="h-5 w-5" />
                    </Button>

                    <Input placeholder="Type text only..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={(e) => { if(e.key === 'Enter') handleSend(); }} className="flex-1 h-12 rounded-2xl bg-muted/50 border-none px-6 text-xs font-bold shadow-inner" />
                    <Button onClick={() => handleSend()} size="icon" disabled={!newMessage.trim() || isUploading} className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">{isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5 text-white" />}</Button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept={activeMediaType === 'image' ? 'image/*' : activeMediaType === 'video' ? 'video/*' : 'application/pdf'} onChange={handleFileSelect} />
            </footer>

            <Dialog open={!!isForwarding} onOpenChange={(o) => !o && setIsForwarding(null)}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none bg-background">
                    <DialogHeader><DialogTitle className="text-center font-black uppercase tracking-tighter">Forward Message</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {recentChats.map(chat => {
                                const id = chat.participants.find((p: string) => p !== currentUser?.$id);
                                return (
                                    <div key={chat.id} onClick={() => { if (selectedForForward.includes(id)) setSelectedForForward(prev => prev.filter(i => i !== id)); else if (selectedForForward.length < 10) setSelectedForForward(prev => [...prev, id]); }} className={cn("flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all", selectedForForward.includes(id) ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                                        <p className="font-bold text-xs truncate">Chat ID: {id}</p>
                                        {selectedForForward.includes(id) && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                );
                            })}
                        </div>
                        <Button className="w-full h-12 rounded-full font-black uppercase text-[10px]" onClick={async () => {
                            if (!isForwarding || selectedForForward.length === 0) return;
                            const msg = messages.find(m => m.$id === isForwarding);
                            if (msg) {
                                for (const targetId of selectedForForward) {
                                    const fwdChatId = getChatId(currentUser?.$id, targetId);
                                    await setDoc(doc(db, COLLECTION_ID_MESSAGES, ID.unique()), { chatId: fwdChatId, senderId: currentUser?.$id, text: msg.text, status: 'sent', deletedFor: [], createdAt: serverTimestamp(), ...(msg.mediaUrl && { mediaUrl: msg.mediaUrl, mediaType: msg.mediaType }) });
                                }
                                setIsForwarding(null); setSelectedForForward([]); toast({ title: 'Forwarded' });
                            }
                        }} disabled={selectedForForward.length === 0}>Send Forward ({selectedForForward.length})</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
