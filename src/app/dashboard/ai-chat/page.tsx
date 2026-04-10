'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Languages, Mic, Send, Loader2, Trash2, ImageIcon, X, Search, Globe, BrainCircuit } from 'lucide-react';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-appwrite';
import { useRouter } from 'next/navigation';
import { account, databases, DATABASE_ID, COLLECTION_ID_MESSAGES, Query, ID, client } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * @fileOverview Sofia AI Chat - High Performance Version.
 * CLOUD SAVING: All messages are stored in Firestore for permanence.
 * KEYBOARD FIX: Footer raised for mobile visibility.
 * DELETION: Click any message to trigger removal.
 */

type Message = {
    $id: string;
    role: 'user' | 'sofia';
    text: string;
    image?: string;
    timestamp: number;
    thoughts?: string;
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
  const [langSearch, setLangSearch] = useState('');
  const [locationStr, setLocationStr] = useState('Determining Location...');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isLangPopoverOpen, setIsLangPopoverOpen] = useState(false);
  
  // Deletion State
  const [msgToDelete, setMsgToDelete] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const chatId = useMemo(() => user?.$id ? `ai_${user.$id}` : null, [user?.$id]);

  const fetchHistory = async () => {
    if (!chatId) return;
    try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
            Query.equal('chatId', chatId),
            Query.orderAsc('$createdAt'),
            Query.limit(100)
        ]);
        
        if (res.total === 0) {
            setMessages([{
                $id: 'welcome',
                role: 'sofia',
                text: "Hello! I am Sofia, your best friend and I-Pay companion. I know where you are and I'm ready to help you manage your world instantly.",
                timestamp: Date.now()
            }]);
        } else {
            const mapped = res.documents.map(doc => ({
                $id: doc.$id,
                role: doc.senderId === user?.$id ? 'user' : 'sofia',
                text: doc.text,
                image: doc.image,
                timestamp: new Date(doc.$createdAt).getTime(),
                thoughts: doc.thoughts
            } as Message));
            setMessages(mapped);
        }
    } catch (e) {
        console.error("History fetch failed", e);
    } finally {
        setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!chatId) return;
    fetchHistory();

    const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
        const payload = response.payload as any;
        if (payload.chatId === chatId) {
            fetchHistory();
        }
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            setLocationStr(`Location: ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        }, () => {
            setLocationStr("Location Hidden");
        });
    }

    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
        };
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => unsub();
  }, [chatId, user?.$id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMicClick = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        try {
            if (recognitionRef.current) {
                recognitionRef.current.lang = 'en-US';
                recognitionRef.current.start();
                setIsListening(true);
            }
        } catch (e) {
            toast({ title: "Microphone error", description: "Could not start speech recognition." });
        }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading || !user || !chatId) return;

    const userMsg = input.trim();
    const currentImg = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 1. Save User Message to Cloud DB
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
          chatId: chatId,
          senderId: user.$id,
          text: userMsg,
          image: currentImg || undefined,
          status: 'sent'
      });

      // 2. Call Sofia
      const response = await chatSofia({
        message: userMsg,
        language: selectedLanguage,
        userId: user.$id,
        username: profile?.username || 'Friend',
        location: locationStr,
        currentTime: new Date().toLocaleString(),
        photoDataUri: currentImg || undefined
      });

      // 3. Save Sofia Message to Cloud DB
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
          chatId: chatId,
          senderId: 'sofia_system',
          text: response.text,
          thoughts: response.thoughts,
          status: 'sent'
      });
      
      if (response.action && response.action !== 'none') {
          handleSofiaAction(response.action, response.email);
      }
    } catch (error: any) {
      console.error("Sofia Error:", error);
      const errorMsg = error.message?.includes('leaked') || error.message?.includes('403') 
        ? "Access Denied: The API key has been revoked by Google. Please check your admin dashboard."
        : "Sofia is temporarily unavailable. Check your connection.";
      
      toast({ variant: 'destructive', title: "Sofia Snagged", description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
      if (!msgToDelete) return;
      try {
          await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, msgToDelete);
          toast({ title: "Message Deleted" });
          fetchHistory();
      } catch (e) {
          toast({ variant: 'destructive', title: "Delete Failed" });
      } finally {
          setMsgToDelete(null);
      }
  };

  const handleSofiaAction = (action: string, email?: string) => {
    switch (action) {
        case 'logout': account.deleteSession('current').then(() => router.push('/auth/signin')); break;
        case 'call': window.location.href = `tel:${email || ''}`; break;
        case 'market': router.push('/dashboard/market'); break;
        case 'transfer': router.push('/dashboard/transfer'); break;
        case 'transaction': router.push('/dashboard/history'); break;
        case 'home': router.push('/dashboard'); break;
        default: break;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b flex items-center justify-between p-3 pt-12 z-50">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary shadow-sm">
                <AvatarImage src="https://picsum.photos/seed/sofia/100/100" />
                <AvatarFallback className="bg-primary text-white">S</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="font-black text-xs uppercase tracking-widest text-primary">Sofia</h2>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">{locationStr}</p>
            </div>
        </div>
        <Popover open={isLangPopoverOpen} onOpenChange={setIsLangPopoverOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-full font-black uppercase text-[9px] gap-2 border-primary/20">
                    <Globe className="h-3 w-3 text-primary" /> {selectedLanguage}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-0 rounded-2xl overflow-hidden border-primary/20">
                <div className="p-2 border-b bg-muted/50">
                    <Input placeholder="Search..." value={langSearch} onChange={e => setLangSearch(e.target.value)} className="h-8 text-xs rounded-xl" />
                </div>
                <ScrollArea className="h-[200px]">
                    {['English', 'Hausa', 'Yoruba', 'Igbo', 'French', 'Arabic'].map(l => (
                        <Button key={l} variant="ghost" className="w-full justify-start text-[10px] font-bold uppercase h-10" onClick={() => { setSelectedLanguage(l); setIsLangPopoverOpen(false); }}>{l}</Button>
                    ))}
                </ScrollArea>
            </PopoverContent>
        </Popover>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 pb-40">
        {dataLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary/30" /></div>
        ) : messages.map((msg) => (
            <div key={msg.$id} className={cn("flex flex-col animate-in fade-in slide-in-from-bottom-2", msg.role === 'user' ? "items-end" : "items-start")}>
                <div 
                    onClick={() => setMsgToDelete(msg.$id)}
                    className={cn(
                        "max-w-[85%] rounded-[1.5rem] p-4 text-sm relative shadow-sm cursor-pointer active:scale-[0.98] transition-transform",
                        msg.role === 'user' 
                            ? "bg-primary text-white rounded-tr-none" 
                            : "bg-muted text-foreground rounded-tl-none border"
                    )}
                >
                    {msg.image && (
                        <div className="mb-3 relative h-48 w-full rounded-xl overflow-hidden">
                            <Image src={msg.image} alt="Upload" fill className="object-cover" />
                        </div>
                    )}
                    <p className="font-bold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.role === 'sofia' && msg.thoughts && (
                        <div className="mt-3 pt-3 border-t border-black/5 flex items-start gap-2 opacity-40 italic text-[10px]">
                            <BrainCircuit className="h-3 w-3 shrink-0 mt-0.5" />
                            <p>{msg.thoughts}</p>
                        </div>
                    )}
                </div>
                <span className="text-[8px] font-black uppercase text-muted-foreground mt-2 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-muted border rounded-[1.5rem] p-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Sofia is thinking... 💭
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom pb-20 z-50">
        {selectedImage && (
            <div className="mb-3 p-2 bg-muted rounded-xl relative border w-fit mx-auto">
                <Image src={selectedImage} alt="Preview" width={80} height={80} className="rounded-lg" />
                <Button variant="destructive" size="icon" className="h-5 w-5 absolute -top-2 -right-2 rounded-full shadow-md" onClick={() => setSelectedImage(null)}><X className="h-3 w-3" /></Button>
            </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-2xl mx-auto px-2">
          <Input 
            placeholder={`Talk to Sofia...`} 
            value={input}
            onChange={e => setInput(e.target.value)}
            className="h-12 bg-muted/50 border-none rounded-[1.2rem] px-6 font-bold shadow-inner"
          />
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} className={cn("h-12 w-12 rounded-full", selectedImage && "text-primary bg-primary/10")}>
            <ImageIcon className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" type="button" onClick={handleMicClick} className={cn("h-12 w-12 rounded-full", isListening && "text-red-500 bg-red-50 animate-pulse")}>
            <Mic className="h-6 w-6" />
          </Button>
          <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setSelectedImage(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
          <Button size="icon" type="submit" className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90" disabled={isLoading || (!input.trim() && !selectedImage)}>
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </footer>

      {/* Deletion Dialog */}
      <AlertDialog open={!!msgToDelete} onOpenChange={(o) => !o && setMsgToDelete(null)}>
          <AlertDialogContent className="rounded-[2rem]">
              <AlertDialogHeader>
                  <AlertDialogTitle className="font-black uppercase text-sm text-center">Delete Message?</AlertDialogTitle>
                  <AlertDialogDescription className="text-center font-bold text-xs">This will remove this message from your cloud history permanently.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                  <AlertDialogCancel className="flex-1 rounded-xl font-black uppercase text-[10px]">Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteMessage} className="flex-1 rounded-xl font-black uppercase text-[10px] bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
