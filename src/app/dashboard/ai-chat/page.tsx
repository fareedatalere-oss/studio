
'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Mic, MoreVertical, Send, Loader2, Trash2, Camera, Image as ImageIcon, X } from 'lucide-react';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-appwrite';
import { useRouter } from 'next/navigation';
import { account } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const languages = [
  'English', 'Hausa', 'Hindi', 'Arabic', 'Kanuri', 'French', 'Bura', 'Fulani', 'Igbo', 'Yoruba', 'Chinese'
];

type Message = {
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
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [locationStr, setLocationStr] = useState('Determining Location...');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sofia-chat');
    if (saved) {
        try {
            setMessages(JSON.parse(saved));
        } catch {
            setMessages([]);
        }
    } else {
        setMessages([{
            role: 'sofia',
            text: "Hello! I am Sofia, your I-Pay assistant. I'm ready to help you manage your world.",
            timestamp: Date.now()
        }]);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            setLocationStr(`Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`);
        }, () => {
            setLocationStr("Location Access Denied");
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
    localStorage.setItem('sofia-chat', JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        // Prefer a professional female voice
        const femaleVoice = voices.find(v => 
            v.name.includes('Female') || 
            v.name.includes('Google UK English Female') || 
            v.name.includes('Samantha') ||
            v.name.includes('Microsoft Zira')
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        try {
            recognitionRef.current?.start();
            setIsListening(true);
        } catch (e) {
            toast({ title: "Microphone error", description: "Could not start speech recognition." });
        }
    }
  };

  const handleDeleteMessage = (timestamp: number) => {
    setMessages(prev => prev.filter(m => m.timestamp !== timestamp));
  }

  const handleAction = (action?: string) => {
    if (!action || action === 'none') return;
    if (action === 'logout') {
        toast({ title: "Logging out..." });
        account.deleteSession('current').then(() => router.push('/auth/signin'));
    } else if (action === 'call') {
        window.location.href = 'tel:';
    }
  }

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
        username: profile?.username || 'User',
        location: locationStr,
        currentTime: new Date().toLocaleString(),
        photoDataUri: currentImg || undefined
      });

      const sofiaMsg: Message = { role: 'sofia', text: response.text, timestamp: Date.now() };
      setMessages(prev => [...prev, sofiaMsg]);
      speakText(response.text);
      handleAction(response.action);
      
      if (response.imageToGenerate) {
          toast({ title: "Creating Image...", description: "Sofia is generating visuals for you." });
      }
    } catch (error: any) {
      console.error("Sofia Error:", error);
      setMessages(prev => [...prev, { role: 'sofia', text: "I hit a snag processing your request. Please try again or check your API connection.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
        reader.readAsDataURL(e.target.files[0]);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-background">
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3 z-10">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-primary">
                <AvatarImage src="https://picsum.photos/seed/sofia/100/100" />
                <AvatarFallback className="bg-primary text-primary-foreground">S</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="font-bold text-lg leading-none">Sofia</h2>
                <p className="text-[10px] text-muted-foreground mt-1">{locationStr}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
                        <Languages className="h-4 w-4" />
                        <span className="hidden sm:inline">{selectedLanguage}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                    {languages.map((lang) => (
                        <DropdownMenuItem key={lang} onClick={() => setSelectedLanguage(lang)}>{lang}</DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {messages.map((msg) => (
            <div key={msg.timestamp} className={cn("flex w-full flex-col group", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn(
                    "max-w-[85%] rounded-2xl p-4 text-sm relative shadow-sm",
                    msg.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border border-border"
                )}>
                    {msg.image && (
                        <div className="mb-3 relative h-48 w-full">
                            <Image src={msg.image} alt="Uploaded Content" fill className="object-cover rounded-xl" />
                        </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-3 -right-3 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onClick={() => handleDeleteMessage(msg.timestamp)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <span className="text-[9px] text-muted-foreground mt-2 px-1 font-mono uppercase">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-2xl p-4 text-sm flex items-center gap-3 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Sofia is thinking...
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-4 shadow-inner">
        {selectedImage && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-xl relative w-fit border border-primary/20">
                <Image src={selectedImage} alt="Preview" width={50} height={50} className="rounded-lg object-cover" />
                <Button variant="destructive" size="icon" className="h-6 w-6 absolute -top-2 -right-2 rounded-full shadow-md" onClick={() => setSelectedImage(null)}><X className="h-3 w-3" /></Button>
            </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <Input 
            placeholder={`Type or ask Sofia in ${selectedLanguage}...`} 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            className="h-12 bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
          <div className="flex gap-1">
              <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} className={cn("h-12 w-12 rounded-full", selectedImage ? 'text-primary bg-primary/10' : '')}>
                <ImageIcon className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" type="button" onClick={handleMicClick} className={cn("h-12 w-12 rounded-full", isListening ? 'text-red-500 animate-pulse bg-red-50' : '')}>
                <Mic className="h-6 w-6" />
              </Button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
          <Button size="icon" type="submit" className="h-12 w-12 rounded-full shadow-lg" disabled={isLoading || (!input.trim() && !selectedImage)}>
            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
      </footer>
    </div>
  );
}
