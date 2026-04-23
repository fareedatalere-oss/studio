
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Bot, Trash2, Mic, Paperclip, X, Image as ImageIcon, Film, Music, ArrowLeft, MoreVertical, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, deleteDoc, getDocs, doc } from 'firebase/firestore';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

/**
 * @fileOverview Sofia AI Chat Hub v12.2.
 * UPDATED: 1-hour recording limit for Mic / 3-minute limit for Uploads.
 * RENDERING: Medium-sized media for direct visibility.
 */

export default function SofiaChatPage() {
    const { user, profile } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    
    // Voice Note State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const safeDate = (val: any) => {
        if (!val) return new Date();
        try {
            if (typeof val.toDate === 'function') return val.toDate();
            if (val.seconds !== undefined) return new Date(val.seconds * 1000);
            const d = new Date(val);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch (e) { return new Date(); }
    };

    useEffect(() => {
        if (!user?.$id) return;
        const q = query(
            collection(db, 'sofiaChats'),
            where('userId', '==', user.$id)
        );
        
        const unsub = onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sorted = fetched.sort((a, b) => {
                const dateA = safeDate(a.createdAt);
                const dateB = safeDate(b.createdAt);
                return dateA.getTime() - dateB.getTime();
            });
            setMessages(sorted);
        });
        return () => unsub();
    }, [user?.$id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (textOverride?: string, mediaData?: { url: string, type: string }) => {
        const msgText = textOverride || input.trim();
        if (!msgText && !mediaData) return;
        
        setIsLoading(true);
        setInput('');
        
        try {
            let finalMediaUrl = mediaData?.url || '';
            let finalMediaType = mediaData?.type || '';

            // 1. Save User Message
            await addDoc(collection(db, 'sofiaChats'), {
                userId: user.$id,
                text: msgText,
                mediaUrl: finalMediaUrl || null,
                mediaType: finalMediaType || null,
                role: 'user',
                createdAt: serverTimestamp()
            });

            setMediaFile(null);
            setRecordedUrl(null);
            setRecordedBlob(null);

            // 2. Call Sofia Local Brain
            const res = await chatSofia({
                message: msgText || "Shared media.",
                userId: user.$id,
                username: profile?.username || 'User',
                userContext: {
                    nairaBalance: profile?.nairaBalance,
                    rewardBalance: profile?.rewardBalance,
                    followers: profile?.followers?.length,
                    following: profile?.following?.length,
                    clickCount: profile?.clickCount
                }
            });

            // 3. Save Sofia Response
            await addDoc(collection(db, 'sofiaChats'), {
                userId: user.$id,
                text: res.text,
                voiceUrl: res.voiceUrl || null,
                role: 'assistant',
                createdAt: serverTimestamp()
            });

            // 4. Handle Actions
            if (res.action && res.action !== 'none') {
                setTimeout(() => {
                    if (res.action === 'nav_chat') router.push('/dashboard/chat');
                    if (res.action === 'nav_market') router.push('/dashboard/market');
                    if (res.action === 'nav_profile') router.push('/dashboard/profile');
                    if (res.action === 'nav_media') router.push('/dashboard/media');
                    if (res.action === 'nav_deposit') router.push('/dashboard/deposit');
                    if (res.action === 'nav_history') router.push('/dashboard/history');
                    if (res.action === 'nav_rewards') router.push('/dashboard/rewards');
                    if (res.action === 'nav_settings') router.push('/dashboard/profile/settings');
                }, 1500);
            }

        } catch (e: any) {
            console.error("Chat Error:", e);
            toast({ variant: 'destructive', title: 'Sync Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('audio') || file.type.startsWith('video')) {
            toast({ title: "Upload Protocol", description: "Audio and video files are limited to 3 minutes." });
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            const b64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            
            const type = file.type.startsWith('video') ? 'video' : (file.type.startsWith('audio') ? 'audio' : 'image');
            const res = await uploadToCloudinary(b64, type === 'image' ? 'image' : 'video');
            if (res.success) {
                await handleSend('', { url: res.url, type: type });
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    // Recording Logic
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
                    if (prev >= 3600) { // 1 Hour Limit for LIVE Recording
                        stopRecording();
                        return 3600;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Microphone Error' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const sendVoiceNote = async () => {
        if (!recordedBlob) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const b64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(recordedBlob);
            });
            const res = await uploadToCloudinary(b64, 'video');
            if (res.success) {
                await handleSend('', { url: res.url, type: 'audio' });
            }
        } finally {
            setIsUploading(false);
        }
    };

    const playVoice = (url: string) => {
        const audio = new Audio(url);
        audio.play().catch(() => toast({ variant: 'destructive', title: 'Audio Error' }));
    };

    const deleteMessage = async (id: string) => {
        await deleteDoc(doc(db, 'sofiaChats', id));
    };

    const clearHistory = async () => {
        const q = query(collection(db, 'sofiaChats'), where('userId', '==', user.$id));
        const snap = await getDocs(q);
        const batch = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(batch);
        toast({ title: 'Discussion Cleared' });
    };

    return (
        <div className="flex flex-col h-screen bg-background font-body">
            <header className="p-4 pt-12 border-b flex items-center justify-between bg-muted/30 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full"><ArrowLeft className="h-4 w-4"/></Button>
                    <div className="bg-primary/10 p-2 rounded-2xl"><Bot className="h-5 w-5 text-primary" /></div>
                    <div>
                        <h1 className="font-black uppercase text-sm tracking-tighter text-primary">Sofia</h1>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Local Intelligence</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-black uppercase text-[10px] rounded-2xl">
                        <DropdownMenuItem onClick={clearHistory} className="text-destructive gap-2"><Trash2 className="h-3 w-3" /> Clear Discussion</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl mx-auto space-y-8 pb-10">
                    {messages.map((m) => (
                        <div key={m.id} className={cn("flex flex-col gap-2", m.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "p-4 rounded-3xl shadow-sm text-sm font-bold relative group max-w-[90%] leading-relaxed",
                                m.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                            )}>
                                {m.mediaUrl && (
                                    <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/5 max-w-[280px]">
                                        {m.mediaType === 'image' && <img src={m.mediaUrl} className="w-full h-auto object-cover" alt="Identity"/>}
                                        {m.mediaType === 'video' && <video src={m.mediaUrl} controls className="w-full h-auto"/>}
                                        {m.mediaType === 'audio' && <audio src={m.mediaUrl} controls className="w-full h-10 p-2"/>}
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{m.text}</p>
                                
                                {m.voiceUrl && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="mt-3 h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                                        onClick={() => playVoice(m.voiceUrl)}
                                    >
                                        <Volume2 className="h-4 w-4" />
                                    </Button>
                                )}

                                <button 
                                    onClick={() => deleteMessage(m.id)} 
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <X className="h-3 w-3"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {(isLoading || isUploading) && (
                        <div className="flex items-center gap-3 text-primary animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{isUploading ? 'Uploading Media...' : 'Sofia thinking...'}</span>
                        </div>
                    ) }
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <footer className="p-4 border-t bg-background pb-10">
                <div className="max-w-2xl mx-auto space-y-4">
                    {recordedUrl ? (
                        <div className="flex items-center gap-2 bg-muted p-2 rounded-2xl animate-in slide-in-from-bottom-2">
                             <Button variant="ghost" size="icon" onClick={() => { setRecordedUrl(null); setRecordedBlob(null); }} className="text-destructive"><X className="h-5 w-5" /></Button>
                             <audio src={recordedUrl} controls className="flex-1 h-10" />
                             <Button onClick={sendVoiceNote} size="icon" className="bg-primary text-white h-12 w-12 rounded-2xl shadow-lg" disabled={isUploading}>
                                {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                             </Button>
                        </div>
                    ) : isRecording ? (
                        <div className="flex items-center justify-between bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                                <span className="font-black text-xs text-red-600 uppercase tracking-widest">{format(recordingDuration * 1000, 'mm:ss')}</span>
                            </div>
                            <Button onClick={stopRecording} variant="destructive" size="sm" className="rounded-full font-black uppercase text-[10px]">Stop</Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-muted/50 transition-all active:scale-90"><Paperclip className="h-5 w-5"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40 rounded-2xl p-2 font-black uppercase text-[9px] shadow-2xl">
                                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2"><ImageIcon className="h-4 w-4" /> Image</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2"><Film className="h-4 w-4" /> Video</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2"><Music className="h-4 w-4" /> Audio</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Input 
                                placeholder="Type a message..." 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                className="flex-1 h-12 rounded-2xl bg-muted border-none px-6 font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary"
                                disabled={isLoading || isUploading}
                            />
                            {!input.trim() ? (
                                <Button onClick={startRecording} size="icon" className="h-12 w-12 rounded-2xl shadow-xl bg-primary text-white">
                                    <Mic className="h-5 w-5" />
                                </Button>
                            ) : (
                                <Button onClick={() => handleSend()} disabled={isLoading || isUploading} size="icon" className="h-12 w-12 rounded-2xl shadow-xl bg-primary text-white">
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5"/>}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileSelect} />
            </footer>
        </div>
    );
}
