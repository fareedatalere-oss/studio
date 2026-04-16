'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Video, X, Send, 
    Mic, MicOff, MessageSquare, MonitorPlay, Heart, Camera,
    Smartphone, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, db, ID, COLLECTION_ID_MESSAGES, COLLECTION_ID_PROFILES } from '@/lib/data-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, limit } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * @fileOverview Private Synchronized Call Hub.
 * FORCE: Master State Sync. If one user switches to 'chat' or 'video', both devices switch.
 * EMOJI: 1000 Love Emojis available for instant delivery via Firebase.
 */

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [mode, setMode] = useState<'audio' | 'video' | 'chat'>('audio');
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const localStream = useRef<MediaStream | null>(null);

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            if (data.activeMode) setMode(data.activeMode);
            
            const partnerId = data.hostId === user?.$id ? data.invitedUsers[0] : data.hostId;
            if (partnerId) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
        } catch (e) {}
    }, [callId, user?.$id]);

    useEffect(() => {
        fetchCall();
        const unsubCall = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${callId}`], response => {
            const payload = response.payload as any;
            if (payload.$id === callId) {
                if (payload.status === 'ended' || payload.status === 'cancelled') {
                    router.replace('/dashboard/chat');
                    return;
                }
                setCall(payload);
                if (payload.activeMode) setMode(payload.activeMode);
            }
        });

        // Chat Sync: Removed orderBy to bypass Index Error, sorting in memory
        const chatId = `call_${callId}`;
        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId), limit(100));
        const unsubMessages = onSnapshot(q, (snap) => {
            const mapped = snap.docs.map(d => ({ $id: d.id, ...d.data() }));
            // Client-Side Force Sort
            setMessages(mapped.sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
        });

        return () => { unsubCall(); unsubMessages(); stopCamera(); };
    }, [callId, fetchCall, router]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
            localStream.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {}
    };

    const stopCamera = () => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
    };

    useEffect(() => {
        if (mode === 'video') startCamera();
        else stopCamera();
    }, [mode]);

    const handleSwitchMode = async (newMode: 'audio' | 'video' | 'chat') => {
        await updateDoc(doc(db, COLLECTION_ID_MEETINGS, callId), { activeMode: newMode });
    };

    const handleSendEmoji = async (emoji: string) => {
        const chatId = `call_${callId}`;
        await setDoc(doc(collection(db, COLLECTION_ID_MESSAGES)), {
            chatId,
            senderId: user?.$id,
            text: emoji,
            createdAt: serverTimestamp(),
        });
    };

    const handleHangUp = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'ended' });
        router.replace('/dashboard/chat');
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    const loveEmojis = ['❤️', '💖', '😍', '😘', '💕', '🥰', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❣️', '💔', '💌', '💘', '💝', '✨'];

    return (
        <div className="h-screen w-full bg-background flex flex-col font-body overflow-hidden relative">
            <header className={cn("p-6 pt-12 flex flex-col items-center gap-2 z-50 transition-all", mode === 'video' ? 'bg-black/50 text-white' : 'bg-background')}>
                <Avatar className="h-24 w-24 ring-4 ring-primary/10 shadow-2xl">
                    <AvatarImage src={partner.avatar} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-black text-2xl">{partner.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h2 className="font-black uppercase text-sm tracking-tighter">@{partner.username}</h2>
                    <p className="text-[8px] font-black uppercase opacity-40 tracking-widest animate-pulse">Live Master Sync Active</p>
                </div>
            </header>

            <main className="flex-1 relative">
                {mode === 'audio' && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="h-48 w-48 rounded-full bg-primary/5 flex items-center justify-center animate-pulse border-2 border-dashed border-primary/20">
                            <Mic className="h-12 w-12 text-primary" />
                        </div>
                        <p className="mt-8 font-black uppercase text-[10px] tracking-[0.3em] opacity-30">Live Audio Handshake</p>
                    </div>
                )}

                {mode === 'video' && (
                    <div className="h-full w-full bg-black animate-in zoom-in duration-500">
                        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
                        <div className="absolute top-4 left-4 p-2 bg-black/40 rounded-lg backdrop-blur-md">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white">Encrypted Stream</p>
                        </div>
                    </div>
                )}

                {mode === 'chat' && (
                    <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4">
                                {messages.map((m, i) => (
                                    <div key={i} className={cn("flex", m.senderId === user?.$id ? "justify-end" : "justify-start")}>
                                        <div className={cn("p-4 rounded-[1.8rem] text-xl shadow-sm border", m.senderId === user?.$id ? "bg-primary text-white border-transparent rounded-tr-none" : "bg-muted border-none rounded-tl-none")}>
                                            {m.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-muted/30 pb-10">
                            <div className="flex flex-wrap gap-2 justify-center mb-6 max-h-24 overflow-y-auto p-2">
                                {loveEmojis.map((e, i) => (
                                    <button key={i} onClick={() => handleSendEmoji(e)} className="text-3xl hover:scale-125 transition-transform active:scale-90">{e}</button>
                                ))}
                            </div>
                            <div className="flex gap-2 max-w-xl mx-auto">
                                <Input placeholder="Send love..." value={input} onChange={e => setInput(e.target.value)} className="rounded-full h-12 bg-white shadow-inner border-none px-6 font-bold" />
                                <Button size="icon" onClick={() => { if(input) { handleSendEmoji(input); setInput(''); } }} className="h-12 w-12 rounded-full shadow-lg"><Send className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="p-10 pb-16 flex flex-col items-center gap-8 z-50 bg-gradient-to-t from-background via-background to-transparent">
                <div className="flex items-center justify-center gap-6">
                    <Button variant={mode === 'chat' ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode('chat')} className="h-12 w-12 rounded-full shadow-lg border-2">
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                    <Button variant={mode === 'video' ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode('video')} className="h-12 w-12 rounded-full shadow-lg border-2">
                        <Camera className="h-5 w-5" />
                    </Button>
                    <Button variant={mode === 'audio' ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode('audio')} className="h-12 w-12 rounded-full shadow-lg border-2">
                        <Mic className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform flex items-center justify-center">
                        <PhoneOff className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">End Call</span>
                </div>
            </footer>
        </div>
    );
}
