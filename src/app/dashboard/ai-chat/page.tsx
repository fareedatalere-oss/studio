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
import { Languages, Mic, Send, Loader2, Trash2, ImageIcon, X, Search, Globe } from 'lucide-react';
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
  { name: "Fulani", code: "ff-NG" },
  { name: "Kanuri", code: "kr-NG" },
  { name: "Arabic", code: "ar-SA" },
  { name: "French", code: "fr-FR" },
  { name: "Spanish", code: "es-ES" },
  { name: "Hindi", code: "hi-IN" },
  { name: "Chinese (Simplified)", code: "zh-CN" },
  { name: "Chinese (Traditional)", code: "zh-TW" },
  { name: "Bengali", code: "bn-BD" },
  { name: "Portuguese", code: "pt-PT" },
  { name: "Russian", code: "ru-RU" },
  { name: "Japanese", code: "ja-JP" },
  { name: "Punjabi", code: "pa-IN" },
  { name: "German", code: "de-DE" },
  { name: "Javanese", code: "jv-ID" },
  { name: "Telugu", code: "te-IN" },
  { name: "Marathi", code: "mr-IN" },
  { name: "Turkish", code: "tr-TR" },
  { name: "Korean", code: "ko-KR" },
  { name: "Vietnamese", code: "vi-VN" },
  { name: "Tamil", code: "ta-IN" },
  { name: "Italian", code: "it-IT" },
  { name: "Urdu", code: "ur-PK" },
  { name: "Gujarati", code: "gu-IN" },
  { name: "Polish", code: "pl-PL" },
  { name: "Ukrainian", code: "uk-UA" },
  { name: "Persian", code: "fa-IR" },
  { name: "Malayalam", code: "ml-IN" },
  { name: "Kannada", code: "kn-IN" },
  { name: "Oriya", code: "or-IN" },
  { name: "Sundanese", code: "su-ID" },
  { name: "Pashto", code: "ps-AF" },
  { name: "Romanian", code: "ro-RO" },
  { name: "Bhojpuri", code: "bho-IN" },
  { name: "Azerbaijani", code: "az-AZ" },
  { name: "Maithili", code: "mai-IN" },
  { name: "Burmese", code: "my-MM" },
  { name: "Hakka", code: "zh-HK" },
  { name: "Amharic", code: "am-ET" },
  { name: "Oromo", code: "om-ET" },
  { name: "Uzbek", code: "uz-UZ" },
  { name: "Sindhi", code: "sd-PK" },
  { name: "Tagalog", code: "tl-PH" },
  { name: "Thai", code: "th-TH" },
  { name: "Dutch", code: "nl-NL" },
  { name: "Khmer", code: "km-KH" },
  { name: "Sinhala", code: "si-LK" },
  { name: "Somali", code: "so-SO" },
  { name: "Greek", code: "el-GR" },
  { name: "Czech", code: "cs-CZ" },
  { name: "Hungarian", code: "hu-HU" },
  { name: "Swedish", code: "sv-SE" },
  { name: "Norwegian", code: "no-NO" },
  { name: "Danish", code: "da-DK" },
  { name: "Finnish", code: "fi-FI" },
  { name: "Slovak", code: "sk-SK" },
  { name: "Bulgarian", code: "bg-BG" },
  { name: "Croatian", code: "hr-HR" },
  { name: "Lithuanian", code: "lt-LT" },
  { name: "Latvian", code: "lv-LV" },
  { name: "Estonian", code: "et-EE" },
  { name: "Hebrew", code: "he-IL" },
  { name: "Indonesian", code: "id-ID" },
  { name: "Malay", code: "ms-MY" },
  { name: "Lao", code: "lo-LA" },
  { name: "Zulu", code: "zu-ZA" },
  { name: "Xhosa", code: "xh-ZA" },
  { name: "Afrikaans", code: "af-ZA" },
  { name: "Swahili", code: "sw-KE" },
  { name: "Wolof", code: "wo-SN" },
  { name: "Malagasy", code: "mg-MG" },
  { name: "Nepalese", code: "ne-NP" },
  { name: "Kazakh", code: "kk-KZ" },
  { name: "Kyrgyz", code: "ky-KG" },
  { name: "Tajik", code: "tg-TJ" },
  { name: "Turkmen", code: "tk-TM" },
  { name: "Mongolian", code: "mn-MN" },
  { name: "Georgian", code: "ka-GE" },
  { name: "Armenian", code: "hy-AM" },
  { name: "Albanian", code: "sq-AL" },
  { name: "Macedonian", code: "mk-MK" },
  { name: "Serbian", code: "sr-RS" },
  { name: "Slovenian", code: "sl-SI" },
  { name: "Icelandic", code: "is-IS" },
  { name: "Irish", code: "ga-IE" },
  { name: "Welsh", code: "cy-GB" },
  { name: "Scottish Gaelic", code: "gd-GB" },
  { name: "Basque", code: "eu-ES" },
  { name: "Catalan", code: "ca-ES" },
  { name: "Galician", code: "gl-ES" },
  { name: "Luxembourgish", code: "lb-LU" },
  { name: "Maltese", code: "mt-MT" },
  { name: "Tatar", code: "tt-RU" },
  { name: "Chechen", code: "ce-RU" },
  { name: "Kurdish", code: "ku-TR" }
];

type Message = {
    role: 'user' | 'sofia';
    text: string;
    image?: string;
    timestamp: number;
}

const STORAGE_KEY = 'ipay-sofia-history';

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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langObj = allLanguages.find(l => l.name === selectedLanguage);
        utterance.lang = langObj?.code || 'en-US';
        const voices = window.speechSynthesis.getVoices();
        
        const femaleVoice = voices.find(v => 
            (v.lang.startsWith(utterance.lang.substring(0, 2)) && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
            v.name.includes('Microsoft Zira') || v.name.includes('Premium')
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

  const handleDeleteMessage = (timestamp: number) => {
    const newMessages = messages.filter(m => m.timestamp !== timestamp);
    setMessages(newMessages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
    toast({ title: "Message Deleted" });
  }

  const handleAction = (action?: string, email?: string) => {
    if (!action || action === 'none') return;
    
    switch (action) {
        case 'logout':
            toast({ title: "Logging out..." });
            account.deleteSession('current').then(() => router.push('/auth/signin'));
            break;
        case 'call':
            window.location.href = `tel:${email || ''}`;
            break;
        case 'sms':
            window.location.href = `sms:${email || ''}`;
            break;
        case 'market':
            router.push('/dashboard/market');
            break;
        case 'chat':
            if (email) {
                router.push(`/dashboard/chat/${email}`);
            } else {
                router.push('/dashboard/chat');
            }
            break;
        case 'transaction':
            router.push('/dashboard/history');
            break;
        case 'home':
            router.push('/dashboard');
            break;
        case 'tiktok':
            window.open('https://www.tiktok.com', '_blank');
            break;
        case 'facebook':
            window.open('https://www.facebook.com', '_blank');
            break;
        case 'facebook_lite':
            window.open('https://m.facebook.com', '_blank');
            break;
        case 'whatsapp':
            window.open('https://wa.me/', '_blank');
            break;
        case 'post_media':
            router.push('/dashboard/media/upload/image');
            break;
        case 'transfer':
            router.push('/dashboard/transfer');
            break;
        default:
            break;
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
      handleAction(response.action, response.email);
      
      if (response.imageToGenerate) {
          toast({ title: "Creating Image...", description: "Sofia is generating visuals for you." });
      }
    } catch (error: any) {
      console.error("Sofia Error:", error);
      setMessages(prev => [...prev, { role: 'sofia', text: "I hit a snag processing your request. Please try again.", timestamp: Date.now() }]);
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
            <Popover open={isLangPopoverOpen} onOpenChange={setIsLangPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">{selectedLanguage}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[250px] p-0 shadow-2xl border-primary/20">
                    <div className="p-2 border-b bg-muted/50">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                placeholder="Search languages..." 
                                value={langSearch}
                                onChange={e => setLangSearch(e.target.value)}
                                className="h-8 pl-8 text-xs focus-visible:ring-primary"
                            />
                        </div>
                    </div>
                    <ScrollArea className="h-[300px]">
                        <div className="p-1">
                            {filteredLanguages.map((lang) => (
                                <Button
                                    key={lang.name}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start text-xs h-9 font-normal",
                                        selectedLanguage === lang.name && "bg-primary/10 text-primary font-bold"
                                    )}
                                    onClick={() => {
                                        setSelectedLanguage(lang.name);
                                        setIsLangPopoverOpen(false);
                                        setLangSearch('');
                                    }}
                                >
                                    {lang.name}
                                </Button>
                            ))}
                            {filteredLanguages.length === 0 && (
                                <p className="text-center text-muted-foreground text-[10px] py-4">No results.</p>
                            )}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
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
                        <div className="mb-3 flex justify-center w-full bg-black/5 rounded-xl p-2">
                            <div className="relative h-64 w-64">
                                <Image src={msg.image} alt="Uploaded Content" fill className="object-contain rounded-xl" />
                            </div>
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
            <div className="mb-3 flex items-center justify-center w-full">
                <div className="p-2 bg-muted rounded-xl relative border border-primary/20">
                    <Image src={selectedImage} alt="Preview" width={120} height={120} className="rounded-lg object-contain" />
                    <Button variant="destructive" size="icon" className="h-6 w-6 absolute -top-2 -right-2 rounded-full shadow-md" onClick={() => setSelectedImage(null)}><X className="h-3 w-3" /></Button>
                </div>
            </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <Input 
            placeholder={`Ask Sofia in ${selectedLanguage}...`} 
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
          <input type="file" id="sofia-media-input" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
          <Button size="icon" type="submit" className="h-12 w-12 rounded-full shadow-lg" disabled={isLoading || (!input.trim() && !selectedImage)}>
            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
      </footer>
    </div>
  );
}