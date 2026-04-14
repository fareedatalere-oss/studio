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
import { Globe, Loader2, ImageIcon, Send, Fingerprint } from 'lucide-react';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { account, databases, DATABASE_ID, COLLECTION_ID_MESSAGES, Query, ID, client } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { format } from 'date-fns';

/**
 * @fileOverview Sofia AI Chat - Master High-Speed Version.
 * SHIELDED: Zero loading screen architecture. Page shell opens instantly.
 * VERCEL CONFIG: maxDuration set at page level.
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
  const { user, profile } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [locationStr, setLocationStr] = useState('I-Pay Hub');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [validationRequest, setValidationRequest] = useState<string | null>(null);
  const [validationValue, setValidationValue] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = useMemo(() => user?.$id ? `ai_${user.$id}` : null, [user?.$id]);

  const safeGetTime = (doc: any) => {
      if (!doc) return Date.now();
      const raw = doc.createdAt || doc.timestamp || doc.$createdAt;
      if (!raw) return Date.now();
      if (raw.toMillis) return raw.toMillis();
      if (typeof raw === 'string') return new Date(raw).getTime();
      if (typeof raw === 'number') return raw;
      return Date.now();
  };

  const fetchHistory = useCallback(async () => {
    if (!chatId) return;
    try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
            Query.equal('chatId', chatId),
            Query.limit(50),
            Query.orderDesc('$createdAt')
        ]);
        
        if (res.total === 0) {
            setMessages([{
                $id: 'welcome',
                role: 'sofia',
                text: "Hello! I am Sofia. I'm ready to assist you instantly with transactions or identity validation. How can I help?",
                timestamp: Date.now()
            }]);
        } else {
            const mapped = res.documents.map(doc => ({
                $id: doc.$id,
                role: doc.senderId === user?.$id ? 'user' : 'sofia',
                text: doc.text || '',
                image: doc.image,
                timestamp: safeGetTime(doc)
            } as Message));

            mapped.sort((a, b) => a.timestamp - b.timestamp);
            setMessages(mapped);
        }
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

    // Background Geolocation - No block
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            setLocationStr(`Location: ${pos.coords.latitude.toFixed(1)}, ${pos.coords.longitude.toFixed(1)}`);
        }, () => {});
    }

    return () => unsub();
  }, [chatId, fetchHistory]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageOverride?: string) => {
    const userMsg = messageOverride || input.trim();
    if ((!userMsg && !selectedImage) || isLoading || !user || !chatId) return;

    const currentImgB64 = selectedImage;
    setInput('');
    setSelectedImage(null);
    setValidationRequest(null);
    setIsLoading(true);

    try {
      let finalImgUrl = '';
      if (currentImgB64) {
          const uploadRes = await uploadToCloudinary(currentImgB64, 'image');
          if (uploadRes.success) finalImgUrl = uploadRes.url;
      }

      // 1. Optimistic User UI log
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
          chatId: chatId,
          senderId: user.$id,
          text: userMsg,
          status: 'sent',
          image: finalImgUrl || undefined
      });

      // 2. High-Speed AI Trigger
      const response = await chatSofia({
        message: userMsg,
        language: selectedLanguage,
        userId: user.$id,
        username: profile?.username || 'User',
        nairaBalance: profile?.nairaBalance || 0,
        accountNumber: profile?.accountNumber || 'Pending',
        location: locationStr,
        currentTime: new Date().toLocaleString(),
        photoDataUri: currentImgB64 || undefined
      });

      // 3. Log Sofia's Answer
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
      toast({ variant: 'destructive', title: "Sofia Timeout", description: "Vercel limit reached. Responses are being optimized." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSofiaAction = (action: string, param?: string) => {
    switch (action) {
        case 'logout': account.deleteSession('current').then(() => router.push('/auth/signin')); break;
        case 'call': window.location.href = `tel:${param || ''}`; break;
        case 'sms': window.location.href = `sms:${param || ''}`; break;
        case 'market': router.push('/dashboard/market'); break;
        case 'media': router.push('/dashboard/media'); break;
        case 'transfer': router.push('/dashboard/transfer'); break;
        case 'transaction': router.push('/dashboard/history'); break;
        case 'chat': router.push('/dashboard/chat'); break;
        case 'profile': router.push('/dashboard/profile'); break;
        case 'home': router.push('/dashboard'); break;
        case 'request_validation': setValidationRequest(param || 'BVN/NIN/Phone'); break;
        case 'prepare_post': router.push(`/dashboard/media/upload/text?initialText=${encodeURIComponent(param || '')}`); break;
        default: break;
    }
  }

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center justify-between p-3 pt-12 z-50">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary shadow-sm">
                <AvatarImage src="https://picsum.photos/seed/sofia/100/100" />
                <AvatarFallback className="bg-primary text-white">S</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="font-black text-xs uppercase tracking-widest text-primary">Sofia Master</h2>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">{locationStr}</p>
            </div>
        </div>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-full font-black uppercase text-[9px] gap-2">
                    <Globe className="h-3 w-3 text-primary" /> {selectedLanguage}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-0 rounded-2xl overflow-hidden">
                <ScrollArea className="h-[200px]">
                    {['English', 'Hausa', 'Yoruba', 'Igbo'].map(l => (
                        <Button key={l} variant="ghost" className="w-full justify-start text-[10px] font-bold uppercase h-10" onClick={() => setSelectedLanguage(l)}>{l}</Button>
                    ))}
                </ScrollArea>
            </PopoverContent>
        </Popover>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 pb-40">
        {dataLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary/30" /></div>
        ) : messages.map((msg) => (
            <div key={msg.$id} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn("max-w-[85%] rounded-[1.5rem] p-4 text-sm relative shadow-sm", msg.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-muted text-foreground rounded-tl-none border")}>
                    {msg.image && (
                        <div className="mb-3 relative h-48 w-full rounded-xl overflow-hidden">
                            <Image src={msg.image} alt="Upload" fill className="object-cover" unoptimized />
                        </div>
                    )}
                    <p className="font-bold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[8px] font-black uppercase text-muted-foreground mt-2 px-2">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                </span>
            </div>
        ))}
        
        {validationRequest && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2">
                <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-6 w-full max-w-[85%] space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Fingerprint className="h-5 w-5" />
                        <p className="font-black uppercase text-xs tracking-tighter">Identity Investigation</p>
                    </div>
                    <p className="text-[10px] font-bold opacity-70">Enter {validationRequest} for truthful research.</p>
                    <div className="flex gap-2">
                        <Input placeholder={`Enter ${validationRequest}...`} value={validationValue} onChange={e => setValidationValue(e.target.value)} className="bg-white border-none h-10 rounded-xl font-bold shadow-sm" />
                        <Button onClick={() => { if(!validationValue.trim()) return; const m = `Investigate ${validationRequest}: ${validationValue}`; setValidationValue(''); handleSend(m); }} size="sm" className="rounded-xl font-black uppercase text-[10px]">Verify</Button>
                    </div>
                </div>
            </div>
        )}

        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-muted border rounded-[1.5rem] p-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Investigating...
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t pb-20 z-50">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 max-w-2xl mx-auto px-2">
          <Input placeholder={`Ask Sofia...`} value={input} onChange={e => setInput(e.target.value)} className="h-12 bg-muted/50 border-none rounded-[1.2rem] px-6 font-bold shadow-inner" />
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} className={cn("h-12 w-12 rounded-full", selectedImage && "text-primary bg-primary/10")}>
            <ImageIcon className="h-6 w-6" />
          </Button>
          <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setSelectedImage(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
          <Button size="icon" type="submit" className="h-12 w-12 rounded-full shadow-lg bg-primary" disabled={isLoading || (!input.trim() && !selectedImage)}>
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
