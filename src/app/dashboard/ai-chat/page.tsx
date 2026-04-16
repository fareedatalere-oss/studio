'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Globe, Loader2, ImageIcon, Send, ArrowLeft } from 'lucide-react';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { account, databases, DATABASE_ID, COLLECTION_ID_MESSAGES, Query, ID, client } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { format } from 'date-fns';

/**
 * @fileOverview Sofia AI Chat - Sequential Handshake Logic.
 * FORCE: UI waits for Database Commit before rendering. Terminated white-screen racing.
 */

export const maxDuration = 120;

type Message = {
    $id: string;
    role: 'user' | 'sofia';
    text: string;
    image?: string;
    timestamp: number;
}

export default function AiChatPage() {
  const { user, profile, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = useMemo(() => user?.$id ? `ai_${user.$id}` : null, [user?.$id]);

  const fetchHistory = useCallback(async () => {
    if (!chatId) return;
    try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
            Query.equal('chatId', chatId),
            Query.limit(50)
        ]);
        
        const mapped = res.documents
            .map(doc => ({
                $id: doc.$id,
                role: doc.senderId === user?.$id ? 'user' : 'sofia',
                text: doc.text || '',
                image: doc.image,
                timestamp: new Date(doc.$createdAt).getTime()
            } as Message))
            .sort((a, b) => a.timestamp - b.timestamp);

        setMessages(mapped);
    } catch (e) {
    } finally {
        setDataLoading(false);
    }
  }, [chatId, user?.$id]);

  useEffect(() => {
    setIsMounted(true);
    if (!chatId) return;
    fetchHistory();

    const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
        const payload = response.payload as any;
        if (payload.chatId === chatId) {
            fetchHistory();
        }
    });

    return () => unsub();
  }, [chatId, fetchHistory]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    const userMsg = input.trim();
    if ((!userMsg && !selectedImage) || isLoading || !user || !chatId) return;

    const currentImgB64 = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      let finalImgUrl = '';
      if (currentImgB64) {
          const uploadRes = await uploadToCloudinary(currentImgB64, 'image');
          if (uploadRes.success) finalImgUrl = uploadRes.url;
      }

      // SEQUENTIAL HANDSHAKE: Wait for DB commit before AI call
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
          chatId: chatId,
          senderId: user.$id,
          text: userMsg,
          status: 'sent',
          image: finalImgUrl || undefined
      });

      const response = await chatSofia({
        message: userMsg,
        language: selectedLanguage,
        userId: user.$id,
        username: profile?.username || 'User',
        nairaBalance: profile?.nairaBalance || 0,
        accountNumber: profile?.accountNumber || 'Pending',
        currentTime: new Date().toLocaleString(),
      });

      // SEQUENTIAL HANDSHAKE: Wait for AI response commit
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
          chatId: chatId,
          senderId: 'sofia_system',
          text: response.text,
          status: 'sent'
      });
      
      if (response.action && response.action !== 'none') {
          handleSofiaAction(response.action, response.parameter);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Technical sync", description: "Re-establishing Sofia link." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSofiaAction = (action: string, param?: string) => {
    if (typeof window === 'undefined') return;
    switch (action) {
        case 'logout': account.deleteSession('current').then(() => router.push('/auth/signin')); break;
        case 'home': router.push('/dashboard'); break;
        case 'market': router.push('/dashboard/market'); break;
        case 'media': router.push('/dashboard/media'); break;
        case 'chat': router.push('/dashboard/chat'); break;
        case 'profile': router.push('/dashboard/profile'); break;
        case 'transaction': router.push('/dashboard/history'); break;
        case 'tiktok': window.open('https://www.tiktok.com', '_blank'); break;
        case 'youtube': window.open(param ? `https://www.youtube.com/search?q=${encodeURIComponent(param)}` : 'https://www.youtube.com', '_blank'); break;
        case 'instagram': window.open(param ? `https://www.instagram.com/${param}` : 'https://www.instagram.com', '_blank'); break;
        case 'facebook': window.open(param ? `https://www.facebook.com/${param}` : 'https://www.facebook.com', '_blank'); break;
        case 'whatsapp': window.open(param ? `https://wa.me/${param}` : 'https://web.whatsapp.com', '_blank'); break;
        case 'tel': window.location.href = `tel:${param || ''}`; break;
        case 'sms': window.location.href = `sms:${param || ''}`; break;
        case 'mail': window.location.href = `mailto:${param || ''}`; break;
        case 'maps': window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(param || '')}`, '_blank'); break;
        case 'browser': window.open(param || 'https://www.google.com', '_blank'); break;
        case 'camera': 
            if (navigator.mediaDevices) {
                navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop()));
                toast({ title: 'Camera Access Activated' });
            }
            break;
        default: break;
    }
  }

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen bg-background scrollbar-hide overflow-hidden font-body">
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center justify-between p-3 pt-12 z-50">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-8 w-8 rounded-full bg-muted/50">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src="https://picsum.photos/seed/sofia/100/100" />
                <AvatarFallback className="bg-primary text-white font-black">S</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="font-black text-xs uppercase tracking-widest text-primary leading-none">Sofia Hub</h2>
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Technical Intelligence</p>
            </div>
        </div>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-full font-black uppercase text-[9px] gap-2">
                    <Globe className="h-3 w-3 text-primary" /> {selectedLanguage}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-0 rounded-2xl overflow-hidden shadow-2xl">
                {['English', 'Hausa', 'Yoruba', 'Igbo'].map(l => (
                    <Button key={l} variant="ghost" className="w-full justify-start text-[10px] font-bold uppercase h-10 px-6" onClick={() => setSelectedLanguage(l)}>{l}</Button>
                ))}
            </PopoverContent>
        </Popover>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 pb-40 scroll-smooth">
        {dataLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary/30" /></div>
        ) : messages.map((msg) => (
            <div key={msg.$id} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn("max-w-[85%] rounded-[1.5rem] p-4 text-xs shadow-sm relative", msg.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-muted text-foreground rounded-tl-none border")}>
                    {msg.image && (
                        <div className="mb-3 relative h-48 w-full rounded-xl overflow-hidden border">
                            <Image src={msg.image} alt="Upload" fill className="object-cover" unoptimized />
                        </div>
                    )}
                    <p className="font-bold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[7px] font-black uppercase text-muted-foreground mt-2 px-2 tracking-widest">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                </span>
            </div>
        ))}
        
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-muted border rounded-full px-6 py-2 text-[8px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Analyzing technical...
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t pb-20 z-50 shadow-lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 max-w-2xl mx-auto">
          <Input placeholder="Ask Sofia about Emir of Lere or I-Pay..." value={input} onChange={e => setInput(e.target.value)} className="h-12 bg-muted/50 border-none rounded-2xl px-6 font-bold text-xs" />
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} className={cn("h-12 w-12 rounded-full", selectedImage && "text-primary bg-primary/10")}>
            <ImageIcon className="h-5 w-5" />
          </Button>
          <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setSelectedImage(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
          <Button size="icon" type="submit" className="h-12 w-12 rounded-full shadow-xl bg-primary" disabled={isLoading || (!input.trim() && !selectedImage)}>
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
