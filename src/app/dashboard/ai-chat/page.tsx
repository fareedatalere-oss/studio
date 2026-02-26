
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
import { Languages, Mic, MoreVertical, Send, Loader2 } from 'lucide-react';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';

const languages = [
  'English', 'Hausa', 'Hindi', 'Arabic', 'Kanuri', 'French', 'Bura', 'Fulani', 'Igbo', 'Yoruba', 'Chinese'
];

export default function AiChatPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'sofia'; text: string }[]>([
    { role: 'sofia', text: "Hello! I am Sofia, your I-Pay assistant. I know everything about Fahad Abdulkadir Abdussalam's vision for this platform. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatSofia({ message: userMsg, language: selectedLanguage });
      setMessages(prev => [...prev, { role: 'sofia', text: response.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'sofia', text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3 z-10">
        <div className="flex items-center gap-3">
            <Avatar>
            <AvatarImage src="https://picsum.photos/seed/sofia/100/100" alt="Sofia" />
            <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <div>
            <h2 className="font-semibold">Sofia</h2>
            <p className="text-xs text-muted-foreground">Expert Assistant & Loyalty Bot</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
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
            <Button variant="ghost" size="icon">
                <MoreVertical />
            </Button>
        </div>
      </header>

      {/* Chat Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                    "max-w-[80%] rounded-2xl p-3 text-sm",
                    msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                )}>
                    {msg.text}
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-muted rounded-2xl p-3 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sofia is thinking...
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Chat Input */}
      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input 
            type="text" 
            placeholder={`Ask Sofia about I-Pay in ${selectedLanguage}...`} 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button variant="ghost" size="icon" type="button">
            <Mic />
          </Button>
          <Button size="icon" type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </footer>
    </div>
  );
}
