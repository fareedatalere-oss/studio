'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
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
  File,
  Image as ImageIcon,
  Headphones,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type Message = {
  id: string;
  text: string;
  senderId: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'voice' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  createdAt: any;
};

export default function ChatThreadPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const { user: currentUser, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [inputText, setInputText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // Fetch the other user's profile
  const otherUserDocRef = useMemo(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'users', params.id);
  }, [firestore, params.id]);
  const { data: otherUser, loading: otherUserLoading } = useDoc(otherUserDocRef);

  // Determine the chat ID
  const chatId = useMemo(() => {
    if (!currentUser || !params.id) return null;
    return [currentUser.uid, params.id].sort().join('_');
  }, [currentUser, params.id]);

  // Fetch chat messages
  const messagesQuery = useMemo(() => {
    if (!firestore || !chatId) return null;
    return query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  }, [firestore, chatId]);

  const { data: messages, loading: messagesLoading } = useCollection(messagesQuery);

  const handleSendMessage = async () => {
    if (inputText.trim() && currentUser && chatId) {
      const newMessage: Partial<Message> = {
        text: inputText,
        senderId: currentUser.uid,
        status: 'sent',
        type: 'text',
        createdAt: serverTimestamp(),
      };
      setInputText('');

      const chatDocRef = doc(firestore, 'chats', chatId);
      const messagesCollectionRef = collection(firestore, 'chats', chatId, 'messages');

      // Create chat document if it doesn't exist and add message
      await setDoc(chatDocRef, { 
        participants: [currentUser.uid, params.id],
        lastMessage: inputText,
        lastMessageAt: serverTimestamp()
      }, { merge: true });
      
      await addDoc(messagesCollectionRef, newMessage);
    }
  };
  
  const handleMediaUpload = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Please ensure your Cloudinary API Secret is set in the .env file to enable this.',
    })
  }

  const handleDeleteMessage = (messageId: string) => {
     toast({ title: 'Message deletion not implemented yet.' });
  };
  
  const MessageStatus = ({ status }: { status: Message['status'] }) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" />;
    if (status === 'sent') return <Check className="h-4 w-4" />;
    return null;
  };
  
  const isLoading = userLoading || otherUserLoading;

  if (isLoading) {
      return (
          <div className="flex flex-col h-full">
               <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className='space-y-2'>
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                         <Skeleton className="h-8 w-8 rounded-full" />
                         <Skeleton className="h-8 w-8 rounded-full" />
                         <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </header>
                <div className="flex-1 p-4"></div>
          </div>
      )
  }

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
              <AvatarImage src={otherUser?.avatar || `https://picsum.photos/seed/${otherUser?.uid}/100/100`} alt={otherUser?.username} />
              <AvatarFallback>{otherUser?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
            <h2 className="font-semibold">{otherUser?.username}</h2>
            <div className="flex items-center gap-1.5">
                <span className={'h-2 w-2 rounded-full bg-gray-400'}></span>
                <p className="text-xs text-muted-foreground">Offline</p>
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
                    <DropdownMenuItem onClick={() => setIsBlocked(!isBlocked)}>
                       {isBlocked ? 'Unblock' : 'Block'} User
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete Chat</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      {/* Chat Body */}
      <div className="flex-1 p-4 space-y-4">
        {messagesLoading && <p className='text-center text-muted-foreground'>Loading messages...</p>}
        {messages && messages.map((msg: any) => (
          <DropdownMenu key={msg.id}>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  'flex max-w-[75%] flex-col gap-1',
                  msg.senderId === currentUser?.uid ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-3 py-2',
                    msg.senderId === currentUser?.uid
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.senderId === currentUser?.uid && (
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <span>{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive">
                   <Trash2 className="mr-2 h-4 w-4" />
                   <span>Delete for Me</span>
                </DropdownMenuItem>
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
                    <Button variant="link" className="p-1" onClick={() => setIsBlocked(false)}>Unblock</Button> 
                    to continue chatting.
                </CardContent>
            </Card>
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
                    <DropdownMenuItem onClick={handleMediaUpload}><ImageIcon className="mr-2 h-4 w-4" /><span>Image</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMediaUpload}><Video className="mr-2 h-4 w-4" /><span>Video</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMediaUpload}><File className="mr-2 h-4 w-4" /><span>Document</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMediaUpload}><Headphones className="mr-2 h-4 w-4" /><span>Audio</span></DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={handleMediaUpload}>
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
