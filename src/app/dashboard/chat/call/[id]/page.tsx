
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, MessageSquare, Video, Layout, X, Send, 
    Image as ImageIcon, Music, Film, UploadCloud, MonitorPlay
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, client, Query, ID, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

const LOVE_EMOJIS = ["😍", "🥰", "😘", "😚", "💖", "💝", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍"];

/**
 * @fileOverview Pure White Call Page.
 * Handles "Ringing" and "Connected" states with cinematic White UI.
 * Connects directly to the user's instructions and hand-drawn pick-up sketch.
 */

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const [overlay, setOverlay] = useState<'none' | 'chat' | 'video' | 'display'>('none');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const chatId = useMemo(() => {
        if (!user?.$id || !partner?.$id) return null;
        return [user.$id, partner.$id].sort().join('_');
    }, [user?.$id, partner?.$id]);

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            
            const partnerId = data.invitedUsers?.[0] === user?.$id ? data.hostId : data.invitedUsers?.[0];
            if (partnerId) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
        } catch (e) {
            router.replace('/dashboard/chat');
        }
    }, [callId, user?.$id, router]);

    const fetchMessages = useCallback(async () => {
        if (!chatId) return;
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                Query.equal('chatId', chatId),
                Query.orderDesc('$createdAt'),
                Query.limit(30)
            ]);
            setMessages(res.documents.reverse());
        } catch (e) {}
    }, [chatId]);

    useEffect(() => {
        fetchCall();
        const unsubCall = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${callId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') {
                router.replace('/dashboard/chat');
            }
            setCall(payload);
        });

        return () => {
            unsubCall();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callId, fetchCall, router]);

    useEffect(() => {
        if (overlay === 'chat') {
            fetchMessages();
            const unsubMessages = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
                const payload = response.payload as any;
                if (payload.chatId === chatId) {
                    setMessages(prev => [...prev, payload]);
                }
            });
            return () => unsubMessages();
        }
    }, [overlay, chatId, fetchMessages]);

    useEffect(() => {
        if (call?.status === 'connected') {
            if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                    setDuration(prev => prev + 1);
                }, 1000);
            }
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [call?.status]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleHangUp = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'ended' });
        
        // Post Call Log to Chat
        if (chatId && user && partner) {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
                chatId,
                senderId: 'ipay_system',
                text: `📞 Call finished: ${formatDuration(duration)}`,
                status: 'sent'
            }).catch(() => {});
        }
        
        router.replace('/dashboard/chat');
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || !chatId || !user) return;
        
        const text = chatInput.trim();
        setChatInput('');
        
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
                chatId,
                senderId: user.$id,
                text,
                status: 'sent'
            });
        } catch (e) {}
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploading(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(upload.$id);
            const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'music' : 'image';
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, {
                displayVisible: true, displayUrl: url, displayType: type
            });
        } catch (e) {} finally { setIsUploading(false); }
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

    const isConnected = call.status === 'connected';

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-24 font-body overflow-hidden relative">
            
            {/* CHAT OVERLAY */}
            {overlay === 'chat' && (
                <div className="absolute inset-0 z-[100] bg-white flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
                    <header className="flex justify-between items-center mb-4 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <h2 className="font-black uppercase text-[10px] tracking-widest text-primary">Live Chat</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setOverlay('none')} className="rounded-full bg-muted"><X className="h-5 w-5" /></Button>
                    </header>
                    <ScrollArea className="flex-1 pr-2">
                        <div className="space-y-4 pb-10">
                            {messages.map((msg) => (
                                <div key={msg.$id} className={cn("flex flex-col max-w-[80%]", msg.senderId === user?.$id ? "ml-auto items-end" : "items-start")}>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-xs font-bold shadow-sm",
                                        msg.senderId === user?.$id ? "bg-primary text-white rounded-tr-none" : "bg-muted rounded-tl-none"
                                    )}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <footer className="mt-auto space-y-4">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                            {LOVE_EMOJIS.map(emoji => (
                                <Button key={emoji} variant="ghost" size="sm" className="text-xl h-10 w-10 shrink-0" onClick={() => setChatInput(prev => prev + emoji)}>
                                    {emoji}
                                </Button>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input 
                                placeholder="Type a message..." 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)}
                                className="rounded-full h-12 bg-muted border-none px-6 font-bold"
                            />
                            <Button size="icon" type="submit" className="h-12 w-12 rounded-full" disabled={!chatInput.trim()}>
                                <Send className="h-5 w-5" />
                            </Button>
                        </form>
                    </footer>
                </div>
            )}

            {/* VIDEO OVERLAY */}
            {overlay === 'video' && (
                <div className="absolute inset-0 z-[110] bg-black flex flex-col p-6 animate-in fade-in duration-300">
                    <header className="flex justify-between items-center z-50 pt-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Live Face Call</p>
                        <Button variant="ghost" size="icon" onClick={() => setOverlay('none')} className="rounded-full bg-white/10 text-white"><X className="h-5 w-5" /></Button>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                        <Video className="h-20 w-20 text-white opacity-20 animate-pulse" />
                        <p className="text-white font-black uppercase text-[10px] tracking-widest mt-4">Camera Feed Active</p>
                    </div>
                </div>
            )}

            {/* DISPLAY OVERLAY (BROWN) */}
            {overlay === 'display' && (
                <div className="absolute inset-0 z-[120] bg-[#4e342e] flex flex-col p-6 animate-in slide-in-from-right duration-300">
                    <header className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                        <h2 className="font-black uppercase text-[10px] tracking-widest text-white/50">Shared Display</h2>
                        <Button variant="ghost" size="icon" onClick={() => setOverlay('none')} className="rounded-full bg-white/10 text-white"><X className="h-5 w-5" /></Button>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-[2.5rem] overflow-hidden relative">
                        {call.displayVisible ? (
                            <>
                                {call.displayType === 'image' && <Image src={call.displayUrl} alt="Shared" fill className="object-contain" unoptimized />}
                                {call.displayType === 'video' && <video src={call.displayUrl} controls autoPlay className="w-full h-full" />}
                                {call.displayType === 'music' && (
                                    <div className="flex flex-col items-center gap-6">
                                        <Music className="h-20 w-20 text-primary animate-pulse" />
                                        <audio src={call.displayUrl} controls autoPlay className="w-full max-w-md" />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center space-y-4">
                                <MonitorPlay className="h-16 w-16 mx-auto opacity-20 text-white" />
                                <p className="font-black uppercase text-[10px] tracking-widest text-white/40">No media shared</p>
                                <Button onClick={() => mediaInputRef.current?.click()} variant="outline" className="rounded-full font-black uppercase text-[9px] h-10 border-white/20 text-white hover:bg-white/10">
                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Video / Music
                                </Button>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleMediaUpload} />
                </div>
            )}

            <header className="absolute top-16 left-0 right-0 text-center z-50">
                {isConnected ? (
                    <div className="space-y-1">
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-in fade-in">Connected</p>
                        <p className="text-lg font-black text-black/40">{formatDuration(duration)}</p>
                    </div>
                ) : (
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">
                        {call.hostId === user?.$id ? 'Calling...' : 'Ringing...'}
                    </p>
                )}
            </header>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full px-6">
                <div className="relative">
                    <div className={cn(
                        "absolute inset-0 bg-primary/5 rounded-full -m-6",
                        isConnected ? "animate-none" : "animate-ping"
                    )}></div>
                    <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
                        <AvatarImage src={partner.avatar} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white text-5xl font-black">{partner.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-black text-2xl font-black tracking-tighter">@{partner.username}</h2>
                    {!isConnected && <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">I-Pay Secure Line</p>}
                </div>
            </div>

            <footer className="w-full max-w-sm px-10 flex flex-col items-center gap-8 z-50">
                {isConnected && (
                    <div className="flex items-center justify-center gap-10 w-full animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex flex-col items-center gap-2">
                            <Button onClick={() => setOverlay('chat')} variant="ghost" size="icon" className={cn("h-12 w-12 rounded-full border transition-all", overlay === 'chat' ? "bg-primary text-white border-primary" : "bg-muted border-transparent hover:border-primary")}>
                                <MessageSquare className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40 tracking-widest">Chat</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button onClick={() => setOverlay('video')} variant="ghost" size="icon" className={cn("h-12 w-12 rounded-full border transition-all", overlay === 'video' ? "bg-primary text-white border-primary" : "bg-muted border-transparent hover:border-primary")}>
                                <Video className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40 tracking-widest">Video</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button onClick={() => setOverlay('display')} variant="ghost" size="icon" className={cn("h-12 w-12 rounded-full border transition-all", overlay === 'display' ? "bg-primary text-white border-primary" : "bg-muted border-transparent hover:border-primary")}>
                                <Layout className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40 tracking-widest">Display</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center gap-3">
                    <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                        <PhoneOff className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Hang up</span>
                </div>
            </footer>
        </div>
    );
}
