
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Video, X, Send, 
    Mic, MicOff, MessageSquare, Layout, Smile,
    ImageIcon, Music, Film, MonitorPlay, UploadCloud, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, client, Query, ID } from '@/lib/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { doc, updateDoc as firestoreUpdate } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CALL_EMOJIS = ["💐","🌹","🏵️","🌻","🎈","💋","🥀","🍫","🎉","💮","🎊","🎂","😍","🎁","💏","👩‍❤️_💋_👨","👨_❤️_💋_👨","👩_❤️_💋_👩","👩_❤️_👩","👨_❤️_👨","👩_❤️_👨","💑","🥰","😍","😇","🤩","😘","🫣","🥳","💓","💗","💖","💝","💘","💌","💞","💕","💟","❣️","💔","❤️‍🔥","❤️‍🩹","❤️","🤎","💜","🩵","💙","💚","💛","🧡","🩷","🖤","🩶","🤍","🫀","🫂","👥"];

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [isDisplayOpen, setIsDisplayOpen] = useState(false);
    
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selfVideoRef = useRef<HTMLVideoElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'image' | 'video' | 'music' | null>(null);

    const chatId = useMemo(() => {
        if (!user?.$id || !partner?.$id) return null;
        return [user.$id, partner.$id].sort().join('_') + '_call';
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
        } catch (e) { router.replace('/dashboard/chat'); }
    }, [callId, user?.$id, router]);

    const fetchMessages = useCallback(async () => {
        if (!chatId) return;
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                Query.equal('chatId', chatId),
                Query.orderAsc('$createdAt'),
                Query.limit(50)
            ]);
            setMessages(res.documents);
        } catch (e) {}
    }, [chatId]);

    useEffect(() => {
        fetchCall();
        const unsubCall = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${callId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') router.replace('/dashboard/chat');
            setCall(payload);
        });
        return () => { unsubCall(); if (timerRef.current) clearInterval(timerRef.current); };
    }, [callId, fetchCall, router]);

    useEffect(() => {
        if (call?.status === 'connected' && !timerRef.current) {
            timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
        }
    }, [call?.status]);

    useEffect(() => {
        if (isChatOpen && chatId) {
            fetchMessages();
            const unsubMsg = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
                const payload = response.payload as any;
                if (payload.chatId === chatId) fetchMessages();
            });
            return () => unsubMsg();
        }
    }, [isChatOpen, chatId, fetchMessages]);

    useEffect(() => {
        if (isVideoOpen) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
            }).catch(() => toast({ title: 'Camera Error' }));
        }
    }, [isVideoOpen, toast]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSendChat = async () => {
        if (!chatInput.trim() || !chatId) return;
        const txt = chatInput.trim();
        setChatInput('');
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
            chatId, senderId: user.$id, text: txt, status: 'sent'
        });
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadType) return;

        setIsUploadingMedia(true);
        toast({ title: `Sharing ${uploadType}...` });

        try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const uploadRes = await uploadToCloudinary(base64, uploadType === 'music' ? 'auto' : uploadType);
            if (uploadRes.success) {
                await firestoreUpdate(doc(db, COLLECTION_ID_MEETINGS, callId), {
                    displayUrl: uploadRes.url,
                    displayType: uploadType,
                    displayVisible: true
                });
                toast({ title: 'Shared successfully!' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload failed' });
        } finally {
            setIsUploadingMedia(false);
            setUploadType(null);
        }
    };

    const handleHangUp = async () => {
        try {
            await firestoreUpdate(doc(db, COLLECTION_ID_MEETINGS, callId), { 
                status: 'ended' 
            });
            router.replace('/dashboard/chat');
        } catch (e) {
            router.replace('/dashboard/chat');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

    const isConnected = call.status === 'connected';

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-24 font-body overflow-hidden relative">
            
            <header className="absolute top-16 left-0 right-0 text-center z-50">
                {isConnected ? (
                    <div className="space-y-1">
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-in fade-in">Connected</p>
                        <p className="text-lg font-black text-black/40">{formatDuration(duration)}</p>
                    </div>
                ) : (
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">
                        {call.hostId === user?.$id ? 'Ringing...' : 'Incoming Call...'}
                    </p>
                )}
            </header>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full px-6">
                <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
                    <AvatarImage src={partner.avatar} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-5xl font-black">{partner.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h2 className="text-black text-2xl font-black tracking-tighter">@{partner.username}</h2>
                    {!isConnected && <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">I-Pay Secure Line</p>}
                </div>
            </div>

            <footer className="w-full max-sm px-10 flex flex-col items-center gap-8 z-50">
                {isConnected && (
                    <div className="flex items-center justify-center gap-10 w-full animate-in slide-in-from-bottom-10">
                        <div className="flex flex-col items-center gap-2">
                            <Button onClick={() => setIsChatOpen(true)} variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted">
                                <MessageSquare className="h-5 w-5 text-primary" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40">Chat</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button onClick={() => setIsVideoOpen(true)} variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted">
                                <Video className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40">Video</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button onClick={() => setIsDisplayOpen(true)} variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted">
                                <Layout className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40">Display</span>
                        </div>
                    </div>
                )}

                <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                    <PhoneOff className="h-8 w-8 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Hang up</span>
            </footer>

            {/* VIDEO CALL OVERLAY */}
            {isVideoOpen && (
                <div className="absolute inset-0 z-[250] bg-black flex flex-col animate-in fade-in duration-300">
                    <header className="absolute top-12 left-0 right-0 flex items-center justify-between p-6 z-10">
                        <h2 className="text-white text-3xl font-black uppercase tracking-tighter">Video Call</h2>
                        <Button variant="ghost" size="icon" onClick={() => setIsVideoOpen(false)} className="rounded-full bg-white/10 text-white h-12 w-12"><X className="h-8 w-8" /></Button>
                    </header>

                    <div className="flex-1 relative flex flex-col items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 grayscale">
                             <Avatar className="h-64 w-64"><AvatarImage src={partner.avatar}/></Avatar>
                        </div>
                        <p className="absolute top-[45%] text-white/40 font-black uppercase text-xl tracking-[0.2em]">Receiver</p>
                        
                        <div className="absolute bottom-10 right-10 w-32 aspect-[9/16] bg-muted rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                            <video ref={selfVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            <p className="absolute bottom-2 left-0 right-0 text-center text-[8px] font-black uppercase text-white/60">You</p>
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE CHAT OVERLAY */}
            {isChatOpen && (
                <div className="absolute inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="p-6 pt-16 flex items-center justify-between border-b bg-muted/10">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-primary">Chat</h2>
                        <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="rounded-full bg-muted h-10 w-10"><X className="h-6 w-6" /></Button>
                    </header>

                    <ScrollArea className="flex-1 p-6 space-y-4">
                        <div className="max-w-md mx-auto w-full space-y-4 pb-10">
                            {messages.map(m => (
                                <div key={m.$id} className={cn("flex flex-col", m.senderId === user.$id ? "items-end" : "items-start")}>
                                    <div className={cn(
                                        "p-4 rounded-[1.5rem] shadow-sm text-sm font-bold max-w-[80%]",
                                        m.senderId === user.$id ? "bg-primary text-white rounded-tr-none" : "bg-muted text-black rounded-tl-none border"
                                    )}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <footer className="p-4 bg-muted/20 border-t pb-10">
                        <div className="max-w-md mx-auto w-full space-y-4">
                            <div className="flex gap-2 items-center">
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white shadow-sm" title="Emoji Keyboard (👈)"><Smile className="h-6 w-6 text-primary" /></Button>
                                <Input 
                                    value={chatInput} 
                                    onChange={e => setChatInput(e.target.value)} 
                                    onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Keyboard..." 
                                    className="h-12 flex-1 rounded-2xl bg-white border-none px-6 font-bold shadow-inner"
                                />
                                <Button onClick={handleSendChat} size="icon" className="h-12 w-12 rounded-full bg-primary shadow-lg" title="Send (👉)"><Send className="h-5 w-5 text-white" /></Button>
                            </div>
                            
                            <ScrollArea className="w-full whitespace-nowrap pb-2">
                                <div className="flex gap-3">
                                    {CALL_EMOJIS.map((e, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => setChatInput(prev => prev + e)}
                                            className="text-2xl hover:scale-125 transition-transform active:scale-90"
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </footer>
                </div>
            )}

            {/* BLACK DISPLAY HUB OVERLAY */}
            {(isDisplayOpen || (call.displayVisible && isConnected)) && (
                <div className="absolute inset-0 z-[300] bg-black flex flex-col animate-in fade-in duration-300">
                    <header className="absolute top-12 left-0 right-0 flex items-center justify-between p-6 z-10">
                        <div className="flex items-center gap-3">
                            <Layout className="h-6 w-6 text-primary" />
                            <h2 className="text-white text-xl font-black uppercase tracking-widest">Display Hub</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={async () => {
                            if (user.$id === call.hostId) {
                                await firestoreUpdate(doc(db, COLLECTION_ID_MEETINGS, callId), { displayVisible: false });
                            }
                            setIsDisplayOpen(false);
                        }} className="rounded-full bg-white/10 text-white h-12 w-12"><X className="h-8 w-8" /></Button>
                    </header>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                        {call.displayVisible ? (
                            <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 relative flex items-center justify-center shadow-2xl">
                                {call.displayType === 'image' && (
                                    <Image src={call.displayUrl} alt="Shared Display" fill className="object-contain" unoptimized />
                                )}
                                {call.displayType === 'video' && (
                                    <video src={call.displayUrl} controls autoPlay className="w-full h-full" />
                                )}
                                {call.displayType === 'music' && (
                                    <div className="flex flex-col items-center gap-8">
                                        <div className="h-40 w-40 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary animate-pulse">
                                            <Music className="h-20 w-20 text-primary" />
                                        </div>
                                        <audio src={call.displayUrl} controls autoPlay className="w-full max-w-xs" />
                                        <p className="text-white font-black uppercase text-xs tracking-widest">Playing Live Audio...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center space-y-8 max-w-xs">
                                <MonitorPlay className="h-20 w-20 mx-auto text-primary opacity-30" />
                                <div className="space-y-2">
                                    <p className="text-white font-black uppercase text-lg tracking-tighter">Nothing Shared Yet</p>
                                    <p className="text-white/40 text-[10px] font-bold uppercase leading-relaxed">
                                        You can share images, films, or music tracks with each other in real-time.
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <Button onClick={() => { setUploadType('image'); mediaInputRef.current?.click(); }} variant="ghost" className="flex-col gap-2 h-20 rounded-2xl bg-white/5 border border-white/10">
                                        <ImageIcon className="h-6 w-6 text-primary" />
                                        <span className="text-[8px] font-black uppercase">Image</span>
                                    </Button>
                                    <Button onClick={() => { setUploadType('video'); mediaInputRef.current?.click(); }} variant="ghost" className="flex-col gap-2 h-20 rounded-2xl bg-white/5 border border-white/10">
                                        <Film className="h-6 w-6 text-primary" />
                                        <span className="text-[8px] font-black uppercase">Video</span>
                                    </Button>
                                    <Button onClick={() => { setUploadType('music'); mediaInputRef.current?.click(); }} variant="ghost" className="flex-col gap-2 h-20 rounded-2xl bg-white/5 border border-white/10">
                                        <Music className="h-6 w-6 text-primary" />
                                        <span className="text-[8px] font-black uppercase">Music</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <input type="file" ref={mediaInputRef} className="hidden" onChange={handleMediaUpload} />
                    
                    <footer className="p-8 flex justify-center">
                        <Button onClick={handleHangUp} variant="destructive" className="rounded-full h-14 px-10 font-black uppercase text-xs tracking-widest shadow-2xl">
                            <PhoneOff className="mr-2 h-5 w-5" /> Hang Up Call
                        </Button>
                    </footer>
                </div>
            )}
        </div>
    );
}
