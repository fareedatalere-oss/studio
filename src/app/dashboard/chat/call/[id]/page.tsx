
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Video, X, Send, 
    Mic, MicOff, MessageSquare, MonitorPlay, Heart, Camera,
    Smartphone, Globe, Image as ImageIcon, Film, Music, UploadCloud, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, db, ID, COLLECTION_ID_MESSAGES, COLLECTION_ID_PROFILES } from '@/lib/data-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { collection, query, where, doc, updateDoc, serverTimestamp, setDoc, limit, onSnapshot } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

/**
 * @fileOverview Private Synchronized Call Hub v2.0.
 * MODES: Audio, Video, Chat, Display.
 * DISPLAY MODE: Force media sharing (Films/Images/Music) in real-time.
 * SYNC: Status and Mode changes reflect instantly for both users.
 */

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [mode, setMode] = useState<'audio' | 'video' | 'chat' | 'display'>('audio');
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const localStream = useRef<MediaStream | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const startAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStream.current = stream;
        } catch (e) {
            console.error("Audio Denied.");
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
        if (!callId) return;

        const unsubCall = onSnapshot(doc(db, COLLECTION_ID_MEETINGS, callId), async (snap) => {
            if (!snap.exists()) {
                router.replace('/dashboard/chat');
                return;
            }
            const data = snap.data();
            if (data.status === 'ended' || data.status === 'cancelled') {
                router.replace('/dashboard/chat');
                return;
            }
            setCall(data);
            if (data.activeMode) setMode(data.activeMode);

            if (!partner) {
                const partnerId = data.hostId === user?.$id ? data.invitedUsers[0] : data.hostId;
                if (partnerId) {
                    const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId).catch(() => null);
                    setPartner(p);
                }
            }
        });

        const q = query(collection(db, COLLECTION_ID_MESSAGES), where('chatId', '==', `call_${callId}`), limit(100));
        const unsubMessages = onSnapshot(q, (snap) => {
            const mapped = snap.docs.map(d => ({ $id: d.id, ...d.data() }));
            setMessages(mapped.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0)));
        });

        startAudio(); 

        return () => { unsubCall(); unsubMessages(); stopCamera(); };
    }, [callId, user?.$id, partner, router]);

    useEffect(() => {
        if (mode === 'video') startCamera();
        else {
            if (!localStream.current) startAudio();
        }
        if (mode === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mode]);

    const handleSwitchMode = async (newMode: any) => {
        await updateDoc(doc(db, COLLECTION_ID_MEETINGS, callId), { activeMode: newMode });
    };

    const handleSendEmoji = async (emoji: string) => {
        const msgId = ID.unique();
        await setDoc(doc(db, COLLECTION_ID_MESSAGES, msgId), {
            chatId: `call_${callId}`,
            senderId: user?.$id,
            text: emoji,
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
        });
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const b64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            const res = await uploadToCloudinary(b64, file.type.startsWith('video') ? 'video' : 'auto');
            if (res.success) {
                await updateDoc(doc(db, COLLECTION_ID_MEETINGS, callId), {
                    displayUrl: res.url,
                    displayType: file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') ? 'video' : 'audio')
                });
            }
        } finally { setIsUploading(false); }
    };

    const handleHangUp = async () => {
        await updateDoc(doc(db, COLLECTION_ID_MEETINGS, callId), { status: 'ended' });
        router.replace('/dashboard/chat');
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    const loveEmojis = ["😍","😘","😊","❤️","😜","♥️","💕","💖","💋","💘","💝","💗","💓","💞","💟","❣️","💔","💌","❤️‍🔥","❤️‍🩹","🤎","💜","🩵","💙","💚","💛","🧡","🩷","🩶","🖤","🤍","👄","🫦","🫀","🧠","🫁"];

    return (
        <div className="h-screen w-full bg-background flex flex-col font-body overflow-hidden relative">
            <header className={cn("p-6 pt-12 flex flex-col items-center gap-2 z-50 transition-all", mode === 'video' ? 'bg-black/50 text-white' : 'bg-background')}>
                <Avatar className="h-24 w-24 ring-4 ring-primary/10 shadow-2xl">
                    <AvatarImage src={partner.avatar} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-black text-2xl">{partner.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h2 className="font-black uppercase text-sm tracking-tighter">@{partner.username}</h2>
                    <p className="text-[8px] font-black uppercase opacity-40 tracking-widest animate-pulse">Synchronized Live</p>
                </div>
            </header>

            <main className="flex-1 relative">
                {mode === 'audio' && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="h-48 w-48 rounded-full bg-primary/5 flex items-center justify-center animate-pulse border-2 border-dashed border-primary/20">
                            <Mic className="h-12 w-12 text-primary" />
                        </div>
                        <p className="mt-8 font-black uppercase text-[10px] tracking-[0.3em] opacity-30">Voice Connection Active</p>
                    </div>
                )}

                {mode === 'video' && (
                    <div className="h-full w-full bg-black animate-in zoom-in duration-500 relative">
                        <Button onClick={() => handleSwitchMode('audio')} variant="ghost" size="icon" className="absolute top-4 right-4 z-[100] bg-black/20 hover:bg-black/40 text-white rounded-full"><X className="h-6 w-6"/></Button>
                        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
                    </div>
                )}

                {mode === 'chat' && (
                    <div className="h-full flex flex-col animate-in slide-in-from-bottom-4">
                        <header className="p-4 border-b flex items-center justify-between bg-muted/20">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Private Hub</span>
                            <Button onClick={() => handleSwitchMode('audio')} variant="ghost" size="icon" className="h-8 w-8 rounded-full"><X className="h-4 w-4"/></Button>
                        </header>
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4">
                                {messages.map((m, i) => (
                                    <div key={i} className={cn("flex", m.senderId === user?.$id ? "justify-end" : "justify-start")}>
                                        <div className={cn("p-4 rounded-[1.8rem] text-sm font-bold shadow-sm max-w-[80%]", m.senderId === user?.$id ? "bg-primary text-white rounded-tr-none" : "bg-muted rounded-tl-none")}>{m.text}</div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-muted/30 pb-10">
                            <div className="flex flex-wrap gap-2 justify-center mb-4 max-h-24 overflow-y-auto p-1 scrollbar-hide">
                                {loveEmojis.map((e, i) => (
                                    <button key={i} onClick={() => handleSendEmoji(e)} className="text-3xl hover:scale-125 transition-transform">{e}</button>
                                ))}
                            </div>
                            <div className="flex gap-2 max-w-xl mx-auto">
                                <Input placeholder="Message..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={ev => ev.key === 'Enter' && input && (handleSendEmoji(input), setInput(''))} className="rounded-full h-12 bg-white border-none px-6 font-bold" />
                                <Button size="icon" onClick={() => { if(input) { handleSendEmoji(input); setInput(''); } }} className="h-12 w-12 rounded-full shadow-lg"><Send className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'display' && (
                    <div className="h-full flex flex-col p-6 animate-in fade-in relative">
                        <Button onClick={() => handleSwitchMode('audio')} variant="ghost" size="icon" className="absolute top-4 right-4 z-[100] rounded-full"><X className="h-6 w-6"/></Button>
                        {call.displayUrl ? (
                            <div className="flex-1 flex flex-col items-center justify-center relative">
                                {call.hostId === user?.$id && (
                                    <Button onClick={() => updateDoc(doc(db, COLLECTION_ID_MEETINGS, callId), { displayUrl: null })} variant="destructive" size="icon" className="absolute top-0 right-0 z-50 rounded-full h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                )}
                                {call.displayType === 'image' && <img src={call.displayUrl} className="max-h-full max-w-full rounded-2xl shadow-2xl" alt="Display" />}
                                {call.displayType === 'video' && <video src={call.displayUrl} controls autoPlay className="max-h-full max-w-full rounded-2xl" />}
                                {call.displayType === 'audio' && (
                                    <div className="bg-primary/10 p-10 rounded-full border-4 border-primary animate-pulse">
                                        <Music className="h-20 w-20 text-primary" />
                                        <audio src={call.displayUrl} controls autoPlay className="mt-6" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] opacity-30">
                                <ImageIcon className="h-20 w-20 mb-4" />
                                <p className="font-black uppercase text-xs">Waiting for Media...</p>
                            </div>
                        )}
                        {call.hostId === user?.$id && (
                            <div className="mt-8 flex justify-center gap-4">
                                <Button onClick={() => mediaInputRef.current?.click()} className="rounded-full h-14 px-8 font-black uppercase text-[10px] gap-2 shadow-xl" disabled={isUploading}>
                                    {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                    Upload & Share
                                </Button>
                                <input type="file" ref={mediaInputRef} className="hidden" onChange={handleMediaUpload} accept="image/*,video/*,audio/*" />
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="p-8 pb-16 flex flex-col items-center gap-8 z-50 bg-background/80 backdrop-blur-md border-t shadow-2xl">
                <div className="flex items-center justify-center gap-4">
                    {[
                        { id: 'chat', icon: MessageSquare },
                        { id: 'video', icon: Video },
                        { id: 'display', icon: MonitorPlay },
                        { id: 'audio', icon: Mic }
                    ].map(t => (
                        <Button key={t.id} variant={mode === t.id ? 'default' : 'outline'} size="icon" onClick={() => handleSwitchMode(t.id)} className="h-12 w-12 rounded-full shadow-lg">
                            <t.icon className="h-5 w-5" />
                        </Button>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-2">
                    <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                        <PhoneOff className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">End Session</span>
                </div>
            </footer>
        </div>
    );
}
