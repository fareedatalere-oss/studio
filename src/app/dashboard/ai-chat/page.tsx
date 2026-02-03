'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Mic, MoreVertical, Send } from 'lucide-react';
import Link from 'next/link';

const languages = [
  'English', 'Hausa', 'Hindi', 'Arabic', 'Kanuri', 'French', 'Bura', 'Fulani', 'Igbo', 'Yoruba', 'Chinese'
];

export default function AiChatPage() {

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
            <Avatar>
            <AvatarImage src="https://picsum.photos/seed/sofia/100/100" alt="Sofia" />
            <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <div>
            <h2 className="font-semibold">Sofia</h2>
            <p className="text-xs text-muted-foreground">Your I-Pay Assistant</p>
            </div>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>
                    <Languages className="mr-2 h-4 w-4" />
                    <span>Change Language</span>
                </DropdownMenuItem>
                 {languages.map((lang) => (
                    <DropdownMenuItem key={lang}>{lang}</DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Chat Body */}
      <div className="flex-1 p-4">
        <p className="text-center text-muted-foreground">Ask me anything about I-Pay or your account.</p>
      </div>

      {/* Chat Input */}
      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-3">
        <div className="flex items-center gap-2">
          <Input type="text" placeholder="Chat with Sofia..." />
          <Button variant="ghost" size="icon">
            <Mic />
          </Button>
          <Button size="icon">
            <Send />
          </Button>
        </div>
      </footer>
    </div>
  );
}
