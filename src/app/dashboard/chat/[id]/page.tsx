'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mic,
  Paperclip,
  Send,
  Check,
  CheckCheck,
  MoreVertical,
  Phone,
  Video,
  Trash2,
  CornerUpRight,
  X,
  Play,
  Pause,
  File,
  Image,
  Headphones,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Mock data, in a real app this would come from an API
const mockUser = {
  id: 'user1',
  name: 'Jane Doe',
  avatar: 'https://picsum.photos/seed/101/100/100',
  status: 'online',
};

type Message = {
  id: number;
  text: string;
  sender: 'me' | 'other';
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'voice';
  audioSrc?: string;
};

const initialMessages: Message[] = [
  { id: 1, text: 'Hey, how are you?', sender: 'other', status: 'read', type: 'text' },
  { id: 2, text: 'I am good, thanks! How about you?', sender: 'me', status: 'read', type: 'text' },
  { id: 3, text: 'Doing great. Just working on the I-Pay app.', sender: 'other', status: 'delivered', type: 'text' },
  { id: 4, text: 'Awesome!', sender: 'me', status: 'sent', type: 'text' },
];


export default function ChatThreadPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: inputText,
        sender: 'me',
        status: mockUser.status === 'online' ? 'delivered' : 'sent',
        type: 'text',
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const handleBlockUser = () => {
    setIsBlocked(!isBlocked);
    toast({
      title: isBlocked ? 'User Unblocked' : 'User Blocked',
      description: isBlocked
        ? `You can now send messages to ${mockUser.name}.`
        : `You have blocked ${mockUser.name}.`,
    });
  };

  const handleDeleteMessage = (messageId: number, forEveryone: boolean) => {
    if (forEveryone) {
      setMessages(messages.filter((msg) => msg.id !== messageId));
    } else {
      // In a real app, this would only hide it for the current user.
      // For this prototype, we'll just remove it.
      setMessages(messages.filter((msg) => msg.id !== messageId));
    }
    toast({ title: 'Message Deleted' });
  };
  
  const startRecording = () => {
    setIsRecording(true);
    recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
    }, 1000);
  }

  const stopRecording = () => {
    setIsRecording(false);
    if(recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
    }
    // For prototype, we add a mock voice message
    if (recordingTime > 0) {
        const newMessage: Message = {
            id: messages.length + 1,
            text: `Voice message (${formatTime(recordingTime)})`,
            sender: 'me',
            status: 'delivered',
            type: 'voice',
            audioSrc: '/mock-audio.mp3' // This would be a real URL
        };
        setMessages([...messages, newMessage]);
    }
    setRecordingTime(0);
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }


  const MessageStatus = ({ status }: { status: Message['status'] }) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" />;
    if (status === 'sent') return <Check className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3">
        <div className='flex items-center gap-3'>
            <Link href="/dashboard/chat" className="md:hidden">
            <Button variant="ghost" size="icon">
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
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Phone /></Button>
            <Button variant="ghost" size="icon"><Video /></Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleBlockUser}>
                       {isBlocked ? 'Unblock' : 'Block'} User
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete Chat</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      {/* Chat Body */}
      <div className="flex-1 p-4 space-y-4">
        {messages.map((msg) => (
          <DropdownMenu key={msg.id}>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  'flex max-w-[75%] flex-col gap-1',
                  msg.sender === 'me' ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-3 py-2',
                    msg.sender === 'me'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                    {msg.type === 'voice' ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Play/></Button>
                            <div className="w-32 h-1 bg-muted-foreground/30 rounded-full"></div>
                            <span className="text-xs">{msg.text.match(/\((.*)\)/)?.[1]}</span>
                        </div>
                    ) : (
                         <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    )}
                </div>
                {msg.sender === 'me' && (
                  <div className="flex items-center gap-1">
                    <MessageStatus status={msg.status} />
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
             <DropdownMenuContent>
                <DropdownMenuItem>
                    <CornerUpRight className="mr-2 h-4 w-4" />
                    <span>Forward</span>
                </DropdownMenuItem>
                {msg.sender === 'me' ? (
                    <>
                        <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id, true)} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" />
                           <span>Delete for Everyone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id, false)}>
                           <Trash2 className="mr-2 h-4 w-4" />
                           <span>Delete for Me</span>
                        </DropdownMenuItem>
                    </>
                ) : (
                    <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id, false)}>
                       <Trash2 className="mr-2 h-4 w-4" />
                       <span>Delete for Me</span>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>

      {/* Chat Input */}
      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-3">
        {isBlocked ? (
            <Card className="bg-muted">
                <CardContent className="p-3 text-center text-sm text-muted-foreground">
                    You blocked this user. 
                    <Button variant="link" className="p-1" onClick={handleBlockUser}>Unblock</Button> 
                    to continue chatting.
                </CardContent>
            </Card>
        ) : isRecording ? (
             <div className="flex items-center gap-2">
                <Button variant="destructive" size="icon" onClick={stopRecording}><X /></Button>
                <div className="flex-1 bg-muted rounded-full h-10 flex items-center px-4">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    <p className="text-sm font-mono">{formatTime(recordingTime)}</p>
                </div>
                <Button size="icon" onClick={stopRecording}><Send /></Button>
            </div>
        ) : (
            <div className="flex items-center gap-2">
            <Textarea
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={1}
                className="resize-none min-h-[40px] max-h-[120px]"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><Paperclip /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem><Image className="mr-2 h-4 w-4" /><span>Image</span></DropdownMenuItem>
                    <DropdownMenuItem><Video className="mr-2 h-4 w-4" /><span>Video</span></DropdownMenuItem>
                    <DropdownMenuItem><File className="mr-2 h-4 w-4" /><span>PDF Document</span></DropdownMenuItem>
                    <DropdownMenuItem><Headphones className="mr-2 h-4 w-4" /><span>Audio</span></DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}>
                <Mic />
            </Button>
            <Button size="icon" onClick={handleSendMessage} disabled={!inputText.trim()}>
                <Send />
            </Button>
            </div>
        )}
      </footer>
    </div>
  );
}
