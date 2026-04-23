
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Bot, Trash2, Mic, Paperclip, X, Image as ImageIcon, Film, Music, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, deleteDoc, getDocs, doc } from 'firebase/firestore';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Sofia AI Chat Hub v2.0.
 * MEDIUM SIZE UI: Standard text-sm font.
 * MEDIA: Supports studying images and short videos (3m).
 * HISTORY: User-controlled persistence with delete functions.
 */

export default function SofiaChatPage() {
    const { user, profile } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaPreview, setMediaPreview] = useState<{ url: string, type: string } | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user?.$id) return;
        const q = query(
            collection(db, 'sofiaChats'),
            where('userId', '==', user.$id),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user?.$id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if ((!input.trim() && !mediaPreview) || !user?.$id || isLoading) return;
        
        setIsLoading(true);
        const userMsg = input.trim();
        setInput('');
        
        try {
            let finalMediaUrl = '';
            let finalMediaType = '';

            if (mediaFile) {
                setIsUploading(true);
                const reader = new FileReader();
                const b64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(mediaFile);
                });
                
                const type = mediaFile.type.startsWith('video') ? 'video' : (mediaFile.type.startsWith('audio') ? 'audio' : 'image');
                const res = await uploadToCloudinary(b64, type === 'image' ? 'image' : 'video');
                if (res.success) {
                    finalMediaUrl = res.url;
                    finalMediaType = type;
                }
                setIsUploading(false);
            }

            // 1. Save User Message
            await addDoc(collection(db, 'sofiaChats'), {
                userId: user.$id,
                text: userMsg,
                mediaUrl: finalMediaUrl,
                mediaType: finalMediaType,
                role: 'user',
                createdAt: serverTimestamp()
            });

            setMediaPreview(null);
            setMediaFile(null);

            // 2. Call Sofia Brain
            const res = await chatSofia({
                message: userMsg || "Please study this media.",
                userId: user.$id,
                username: profile?.username || 'User',
                userContext: {
                    nairaBalance: profile?.nairaBalance,
                    followers: profile?.followers?.length,
                    following: profile?.following?.length,
                },
                mediaUrl: finalMediaUrl,
                mediaType: finalMediaType as any
            });

            // 3. Save Sofia Response
            await addDoc(collection(db, 'sofiaChats'), {
                userId: user.$id,
                text: res.text,
                role: 'assistant',
                createdAt: serverTimestamp()
            });

            // 4. Handle Actions
            if (res.action !== 'none') {
                setTimeout(() => {
                    if (res.action === 'nav_chat') router.push('/dashboard/chat');
                    if (res.action === 'nav_market') router.push('/dashboard/market');
                    if (res.action === 'nav_profile') router.push('/dashboard/profile');
                    if (res.action === 'nav_media') router.push('/dashboard/media');
                    if (res.action === 'open_tiktok') window.open('https://www.tiktok.com', '_blank');
                    if (res.action === 'open_external' && res.externalUrl) window.open(res.externalUrl, '_blank');
                }, 1500);
            }

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Brain Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('video') && file.size > 200 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Video too large', description: 'Maximum 3 minutes (approx 200MB).' });
            return;
        }

        setMediaFile(file);
        setMediaPreview({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') ? 'video' : 'audio')
        });
    };

    const deleteMessage = async (id: string) => {
        await deleteDoc(doc(db, 'sofiaChats', id));
    };

    const clearHistory = async () => {
        const q = query(collection(db, 'sofiaChats'), where('userId', '==', user.$id));
        const snap = await getDocs(q);
        const batch = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(batch);
        toast({ title: 'History Wiped' });
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="p-4 pt-12 border-b flex items-center justify-between bg-muted/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ArrowLeft className="h-4 w-4"/></Button>
                    <div className="bg-primary/10 p-2 rounded-2xl"><Bot className="h-5 w-5 text-primary" /></div>
                    <div>
                        <h1 className="font-black uppercase text-sm tracking-tighter">Sofia</h1>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Master Assistant</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearHistory} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </header>

            <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {messages.map((m) => (
                        <div key={m.id} className={cn("flex flex-col gap-2", m.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "p-4 rounded-2xl shadow-sm text-sm font-bold relative group max-w-[85%]",
                                m.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-muted rounded-tl-none"
                            )}>
                                {m.mediaUrl && (
                                    <div className="mb-3 rounded-xl overflow-hidden border border-white/10">
                                        {m.mediaType === 'image' && <img src={m.mediaUrl} className="w-full h-auto" alt="AI Context"/>}
                                        {m.mediaType === 'video' && <video src={m.mediaUrl} controls className="w-full h-auto"/>}
                                        {m.mediaType === 'audio' && <audio src={m.mediaUrl} controls className="w-full h-8"/>}
                                    </div>
                                )}
                                <p className="leading-relaxed">{m.text}</p>
                                <button 
                                    onClick={() => deleteMessage(m.id)} 
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-primary opacity-50 animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sofia is thinking...</span>
                        </div>
                    ) }
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <footer className="p-4 border-t bg-background pb-10">
                <div className="max-w-2xl mx-auto space-y-4">
                    {mediaPreview && (
                        <div className="relative inline-block">
                            <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                                {mediaPreview.type === 'image' && <img src={mediaPreview.url} className="object-cover h-full w-full"/>}
                                {mediaPreview.type === 'video' && <Film className="h-8 w-8 text-primary"/>}
                                {mediaPreview.type === 'audio' && <Music className="h-8 w-8 text-primary"/>}
                            </div>
                            <Button size="icon" variant="destructive" className="h-6 w-6 rounded-full absolute -top-2 -right-2" onClick={() => { setMediaPreview(null); setMediaFile(null); }}>
                                <X className="h-3 w-3"/>
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-12 w-12 rounded-full bg-muted/50"><Paperclip className="h-5 w-5"/></Button>
                        <Input 
                            placeholder="Ask Sofia anything..." 
                            value={input} 
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            className="flex-1 h-12 rounded-2xl bg-muted border-none px-6 font-bold"
                        />
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted/50"><Mic className="h-5 w-5 text-primary"/></Button>
                        <Button onClick={handleSend} disabled={isLoading || isUploading} size="icon" className="h-12 w-12 rounded-full shadow-lg">
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5"/>}
                        </Button>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileSelect} />
            </footer>
        </div>
    );
}
