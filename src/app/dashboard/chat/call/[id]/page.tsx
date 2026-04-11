
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Video, Volume2, Mic, MicOff, X,
    MonitorPlay, Send, MessageSquare, Heart, Play, Pause, UploadCloud,
    Layout, Trash2, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_MESSAGES, COLLECTION_ID_PROFILES, client, Query, ID, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

/**
 * @fileOverview Universal I-Pay White Call UI.
 * SENDER SCREEN: White Page, Center Partner Icon/Name, Ringing Status, Bottom End Call.
 */

const loveEmojis = ["😍", "♥️", "😍", "🥰", "😋", "🤩", "😘", "🧡", "💔", "❣️", "❤️‍🩹", "❤️", "💓", "💗", "🩷", "💖", "💞", "💘", "❣️", "💕", "💚", "💟", "💌", "🖤", "🩶", "🤍", "💋", "🫦", "👄", "🫂", "👥", "🧑‍🧑", "👨‍👧‍👧", "👩‍👧", "👨‍👦"];

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const [status, setStatus] = useState<'calling' | 'ringing' | 'connected'>('calling');
    const [activeMode, setActiveMode] = useState<'voice' | 'video' | 'chat' | 'display'>('voice');
    
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isHost = useMemo(() => user?.$id === call?.hostId, [user?.$id, call?.hostId]);

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            if (data.status === 'ended') {
                router.replace('/dashboard/chat');
                return;
            }
            if (data.status === 'approved' || data.status === 'active') {
                setStatus('connected');
            } else {
                setStatus('ringing');
            }

            const partnerId = isHost ? data.invitedUsers?.[0] : data.hostId;
            if (partnerId) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
        } catch (e) {
            router.replace('/dashboard/chat');
        }
    }, [callId, isHost, router]);

    useEffect(() => {
        fetchCall();
        const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${callId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') {
                router.replace('/dashboard/chat');
            }
            setCall(payload);
            if (payload.status === 'approved' || payload.status === 'active') setStatus('connected');
        });
        return () => unsub();
    }, [callId, fetchCall, router]);

    useEffect(() => {
        if (status !== 'connected') return;
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, [status]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleHangUp = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'ended' });
        const threadId = [user?.$id, partner?.$id].sort().join('_');
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
            chatId: threadId,
            senderId: 'ipay_system',
            text: `📞 Call Duration: ${formatDuration(duration)}`,
            status: 'sent'
        }).catch(() => {});
        router.replace('/dashboard/chat');
    };

    const handleSendChat = async (text: string) => {
        if (!text.trim()) return;
        const msg = { text, senderId: user.$id, timestamp: Date.now() };
        setMessages(prev => [...prev, msg]);
        setChatInput('');
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(upload.$id);
            toast({ title: 'Shared' });
        } catch (e) {} finally { setIsUploading(false); }
    };

    if (!partner) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-20 font-body overflow-hidden">
            <header className="fixed top-12 left-0 right-0 flex justify-center z-50">
                {status === 'connected' && (
                    <div className="bg-primary/10 px-6 py-2 rounded-full border border-primary/20 shadow-sm">
                        <p className="text-primary font-black tracking-widest text-sm">{formatDuration(duration)}</p>
                    </div>
                )}
            </header>

            <main className="flex-1 flex flex-col items-center justify-center space-y-8 w-full px-6">
                <div className="relative">
                    <div className={cn("absolute inset-0 bg-primary/5 rounded-full -m-6", status !== 'connected' && "animate-ping")}></div>
                    <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
                        <AvatarImage src={partner.avatar} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white text-5xl font-black">{partner.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-black text-2xl font-black tracking-tighter">@{partner.username}</h2>
                    <p className={cn(
                        "text-xs font-black uppercase tracking-widest transition-all",
                        status === 'connected' ? "text-green-500" : "text-muted-foreground animate-pulse"
                    )}>
                        {status === 'connected' ? 'Connected' : status === 'ringing' ? 'Ringing...' : 'Calling...'}
                    </p>
                </div>
            </main>

            {activeMode === 'chat' && (
                <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="p-4 pt-12 border-b flex justify-between items-center bg-muted/10">
                        <p className="font-black uppercase text-xs tracking-widest">Live Chat</p>
                        <Button variant="ghost" size="icon" onClick={() => setActiveMode('voice')}><X /></Button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={cn("max-w-[80%] p-4 rounded-2xl text-sm font-bold", m.senderId === user.$id ? "ml-auto bg-primary text-white" : "bg-muted")}>
                                {m.text}
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                    <div className="p-4 border-t bg-white pb-10">
                        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                            {loveEmojis.map(e => (
                                <button key={e} onClick={() => setChatInput(prev => prev + e)} className="text-xl p-2 hover:bg-muted rounded-xl transition-all">{e}</button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="rounded-full h-12" />
                            <Button size="icon" className="rounded-full h-12 w-12" onClick={() => handleSendChat(chatInput)}><Send /></Button>
                        </div>
                    </div>
                </div>
            )}

            {activeMode === 'display' && (
                <div className="absolute inset-0 z-[110] bg-[#4e342e] flex flex-col animate-in fade-in duration-300">
                    <header className="p-4 pt-12 flex justify-between items-center border-b border-white/10">
                        <p className="text-primary font-black uppercase text-xs tracking-widest">Media Display</p>
                        <Button variant="ghost" size="icon" onClick={() => setActiveMode('voice')} className="text-white"><X /></Button>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                        <div className="h-64 w-full rounded-[2.5rem] bg-black/40 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                            {isUploading ? <Loader2 className="animate-spin" /> : <ImageIcon className="h-12 w-12 opacity-20" />}
                        </div>
                        <Button onClick={() => mediaInputRef.current?.click()} className="rounded-full px-10 h-14 font-black uppercase tracking-widest shadow-xl">
                            <UploadCloud className="mr-2" /> Upload Media
                        </Button>
                        <input type="file" ref={mediaInputRef} className="hidden" onChange={handleMediaUpload} />
                    </div>
                </div>
            )}

            <footer className="w-full max-w-sm px-10 pb-10">
                <div className="grid grid-cols-4 gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <Button onClick={() => setActiveMode('chat')} size="icon" variant="outline" className="h-14 w-14 rounded-full shadow-lg border-2 hover:bg-primary/10">
                            <MessageSquare className="h-6 w-6 text-primary" />
                        </Button>
                        <span className="text-[10px] font-black uppercase opacity-50">Chat</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Button onClick={() => setActiveMode('video')} size="icon" variant="outline" className="h-14 w-14 rounded-full shadow-lg border-2 hover:bg-primary/10">
                            <Video className="h-6 w-6 text-primary" />
                        </Button>
                        <span className="text-[10px] font-black uppercase opacity-50">Video</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Button onClick={() => setActiveMode('display')} size="icon" variant="outline" className="h-14 w-14 rounded-full shadow-lg border-2 hover:bg-primary/10">
                            <Layout className="h-6 w-6 text-primary" />
                        </Button>
                        <span className="text-[10px] font-black uppercase opacity-50">Display</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-14 w-14 rounded-full shadow-2xl bg-red-500 hover:bg-red-600">
                            <PhoneOff className="h-6 w-6 text-white" />
                        </Button>
                        <span className="text-[10px] font-black uppercase text-red-600">Hang up</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
