'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mic, Paperclip, Send } from 'lucide-react';
import Link from 'next/link';

export default function ChatThreadPage({ params }: { params: { id: string } }) {
  const mockUser = {
    id: 'user1',
    name: 'Jane Doe',
    avatar: 'https://picsum.photos/seed/101/100/100',
    status: 'online',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center gap-3 p-3">
        <Link href="/dashboard/chat">
          <Button variant="ghost" size="icon" className="md:hidden">
            <ArrowLeft />
          </Button>
        </Link>
        <Avatar>
          <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
          <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{mockUser.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${mockUser.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <p className="text-xs text-muted-foreground">{mockUser.status}</p>
          </div>
        </div>
      </header>

      {/* Chat Body */}
      <div className="flex-1 p-4">
        {/* Messages will go here */}
        <p className="text-center text-muted-foreground">This is the beginning of your chat history.</p>
      </div>

      {/* Chat Input */}
      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-3">
        <div className="flex items-center gap-2">
          <Input type="text" placeholder="Type a message..." />
          <Button variant="ghost" size="icon">
            <Paperclip />
          </Button>
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
