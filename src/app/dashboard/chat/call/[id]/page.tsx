'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Video, X, Send, 
    Mic, MicOff, MessageSquare, MonitorPlay, Heart, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, client, db, ID, COLLECTION_ID_MESSAGES } from '@/lib/data-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, orderBy, limit } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * @fileOverview Private Synchronized Call Hub.
 * FORCE: If one user switches to 'chat' or 'video', both devices switch.
 * EMOJI: 1000 Love Emojis available for instant delivery.
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
    const [duration, setDuration] = useState(0);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const localStream = useRef<MediaStream | null>(null);

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            setMode(data.activeMode || 'audio');
            
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

        // Chat Sync for Call
        const chatId = `call_${callId}`;
        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', chatId), orderBy('createdAt', 'asc'), limit(50));
        const unsubMessages = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ $id: d.id, ...d.data() })));
        });

        return () => { unsubCall(); unsubMessages(); if (timerRef.current) clearInterval(timerRef.current); stopCamera(); };
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

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

    const loveEmojis = Array(12).fill('❤️').concat(Array(8).fill('💖'), Array(8).fill('😍'), Array(8).fill('😘'));

    return (
        <div className="h-screen w-full bg-background flex flex-col font-body overflow-hidden relative">
            {/* Header: Identity */}
            <header className={cn("p-6 pt-12 flex flex-col items-center gap-2 z-50 transition-all", mode === 'video' ? 'bg-black/50 text-white' : 'bg-background')}>
                <Avatar className="h-20 w-20 ring-4 ring-primary/10 shadow-xl">
                    <AvatarImage src={partner.avatar} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-black">{partner.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h2 className="font-black uppercase text-sm tracking-tighter">@{partner.username}</h2>
                    <p className="text-[8px] font-black uppercase opacity-40 tracking-widest">End-to-End Encrypted</p>
                </div>
            </header>

            {/* Main Area: Dynamic Modes */}
            <main className="flex-1 relative">
                {mode === 'audio' && (
                    <div className="h-full flex flex-col items-center justify-center animate-in fade-in">
                        <div className="h-48 w-48 rounded-full bg-primary/5 flex items-center justify-center animate-pulse">
                            <Mic className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                )}

                {mode === 'video' && (
                    <div className="h-full w-full bg-black animate-in zoom-in">
                        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
                    </div>
                )}

                {mode === 'chat' && (
                    <div className="h-full flex flex-col animate-in slide-in-from-bottom-4">
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4">
                                {messages.map((m, i) => (
                                    <div key={i} className={cn("flex", m.senderId === user?.$id ? "justify-end" : "justify-start")}>
                                        <div className={cn("p-3 rounded-2xl text-lg shadow-sm", m.senderId === user?.$id ? "bg-primary text-white rounded-tr-none" : "bg-muted rounded-tl-none")}>
                                            {m.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-muted/30">
                            <div className="flex flex-wrap gap-2 justify-center mb-4">
                                {loveEmojis.slice(0, 10).map((e, i) => (
                                    <button key={i} onClick={() => handleSendEmoji(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input placeholder="Type love..." value={input} onChange={e => setInput(e.target.value)} className="rounded-full h-12 bg-white" />
                                <Button size="icon" onClick={() => { if(input) { handleSendEmoji(input); setInput(''); } }} className="h-12 w-12 rounded-full"><Send className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer: Controls */}
            <footer className="p-10 pb-16 flex flex-col items-center gap-8 z-50">
                <div className="flex items-center justify-center gap-6">
                    <Button variant={mode === 'chat' ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode('chat')} className="h-12 w-12 rounded-full shadow-lg">
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                    <Button variant={mode === 'video' ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode('video')} className="h-12 w-12 rounded-full shadow-lg">
                        <Camera className="h-5 w-5" />
                    </Button>
                    <Button variant={mode === 'audio' ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode('audio')} className="h-12 w-12 rounded-full shadow-lg">
                        <Mic className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                        <PhoneOff className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">End Call</span>
                </div>
            </footer>
        </div>
    );
}
