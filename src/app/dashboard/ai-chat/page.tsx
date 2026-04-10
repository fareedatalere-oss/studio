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
import { Languages, Mic, Send, Loader2, Trash2, ImageIcon, X, Search, Globe, BrainCircuit } from 'lucide-react';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-appwrite';
import { useRouter } from 'next/navigation';
import { account } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

const allLanguages = [
  { name: "English", code: "en-US" },
  { name: "Hausa", code: "ha-NG" },
  { name: "Yoruba", code: "yo-NG" },
  { name: "Igbo", code: "ig-NG" },
  { name: "Arabic", code: "ar-SA" },
  { name: "French", code: "fr-FR" },
  { name: "Spanish", code: "es-ES" }
];

type Message = {
    role: 'user' | 'sofia';
    text: string;
    image?: string;
    timestamp: number;
    thoughts?: string;
}

const STORAGE_KEY = 'ipay-sofia-history-v2';

export default function AiChatPage() {
  const { user, profile } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [langSearch, setLangSearch] = useState('');
  const [locationStr, setLocationStr] = useState('Determining Location...');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isLangPopoverOpen, setIsLangPopoverOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            setMessages(JSON.parse(saved));
        } catch (e) {
            console.error("History load failed", e);
        }
    } else {
        setMessages([{
            role: 'sofia',
            text: "Hello! I am Sofia, your best friend and I-Pay companion. I know where you are and I'm ready to help you manage your world instantly.",
            timestamp: Date.now()
        }]);
    }

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
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredLanguages = useMemo(() => {
    return allLanguages.filter(l => 
        l.name.toLowerCase().includes(langSearch.toLowerCase())
    );
  }, [langSearch]);

  const handleMicClick = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        try {
            if (recognitionRef.current) {
                const langObj = allLanguages.find(l => l.name === selectedLanguage);
                recognitionRef.current.lang = langObj?.code || 'en-US';
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
    if ((!input.trim() && !selectedImage) || isLoading || !user) return;

    const userMsg = input.trim();
    const currentImg = selectedImage;
    setInput('');
    setSelectedImage(null);

    const newMessage: Message = { role: 'user', text: userMsg, image: currentImg || undefined, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const response = await chatSofia({
        message: userMsg,
        language: selectedLanguage,
        userId: user.$id,
        username: profile?.username || 'Friend',
        location: locationStr,
        currentTime: new Date().toLocaleString(),
        photoDataUri: currentImg || undefined
      });

      const sofiaMsg: Message = { 
        role: 'sofia', 
        text: response.text, 
        thoughts: response.thoughts,
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, sofiaMsg]);
      
      if (response.action && response.action !== 'none') {
          handleSofiaAction(response.action, response.email);
      }
    } catch (error: any) {
      console.error("Sofia Error:", error);
      setMessages(prev => [...prev, { role: 'sofia', text: "I hit a snag, my friend. Let me try that again.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
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
                <h2 className="font-black text-xs uppercase tracking-widest">Sofia</h2>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">{locationStr}</p>
            </div>
        </div>
        <Popover open={isLangPopoverOpen} onOpenChange={setIsLangPopoverOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-full font-black uppercase text-[9px] gap-2">
                    <Globe className="h-3 w-3 text-primary" /> {selectedLanguage}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-0 rounded-2xl overflow-hidden border-primary/20">
                <div className="p-2 border-b bg-muted/50">
                    <Input placeholder="Search..." value={langSearch} onChange={e => setLangSearch(e.target.value)} className="h-8 text-xs rounded-xl" />
                </div>
                <ScrollArea className="h-[200px]">
                    {filteredLanguages.map(l => (
                        <Button key={l.name} variant="ghost" className="w-full justify-start text-[10px] font-bold uppercase h-10" onClick={() => { setSelectedLanguage(l.name); setIsLangPopoverOpen(false); }}>{l.name}</Button>
                    ))}
                </ScrollArea>
            </PopoverContent>
        </Popover>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 pb-24">
        {messages.map((msg) => (
            <div key={msg.timestamp} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn(
                    "max-w-[85%] rounded-[1.5rem] p-4 text-sm relative shadow-sm",
                    msg.role === 'user' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border"
                )}>
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

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom pb-8">
        {selectedImage && (
            <div className="mb-3 p-2 bg-muted rounded-xl relative border w-fit">
                <Image src={selectedImage} alt="Preview" width={80} height={80} className="rounded-lg" />
                <Button variant="destructive" size="icon" className="h-5 w-5 absolute -top-2 -right-2 rounded-full shadow-md" onClick={() => setSelectedImage(null)}><X className="h-3 w-3" /></Button>
            </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-2xl mx-auto">
          <Input 
            placeholder={`Talk to Sofia in ${selectedLanguage}...`} 
            value={input}
            onChange={e => setInput(e.target.value)}
            className="h-12 bg-muted/50 border-none rounded-[1.2rem] px-6 font-bold"
          />
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} className={cn("h-12 w-12 rounded-full", selectedImage && "text-primary bg-primary/10")}>
            <ImageIcon className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" type="button" onClick={handleMicClick} className={cn("h-12 w-12 rounded-full", isListening && "text-red-500 bg-red-50 animate-pulse")}>
            <Mic className="h-6 w-6" />
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setSelectedImage(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
          <Button size="icon" type="submit" className="h-12 w-12 rounded-full shadow-lg" disabled={isLoading || (!input.trim() && !selectedImage)}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
