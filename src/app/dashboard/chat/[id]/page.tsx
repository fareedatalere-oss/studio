'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Loader2,
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
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { account, databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { format } from 'date-fns';

type Message = {
  $id: string;
  chatId: string;
  text: string;
  senderId: string;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file' | 'text';
  $createdAt: string;
};

export default function ChatThreadPage({ params }: { params: { id: string } }) {
  const otherUserId = params.id;
  const { toast } = useToast();
  const { user: currentUser, loading: userLoading } = useUser();
  const [chatId, setChatId] = useState<string | null>(null);
  
  const [otherUser, setOtherUser] = useState<any>(null);
  const [otherUserLoading, setOtherUserLoading] = useState(true);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // Placeholder
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<Message['mediaType']>('file');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch other user's profile
  useEffect(() => {
    setOtherUserLoading(true);
    databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId)
      .then(setOtherUser)
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Could not load user profile.' }))
      .finally(() => setOtherUserLoading(false));
  }, [otherUserId, toast]);

  // Find existing chat or prepare for a new one
  const findOrCreateChat = useCallback(async (currentUId: string, otherUId: string) => {
    try {
      // Look for an existing chat
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
        Query.equal('participants', currentUId),
      ]);
      const existingChat = response.documents.find(doc => doc.participants.includes(otherUId));
      
      if (existingChat) {
        setChatId(existingChat.$id);
        return existingChat.$id;
      }
    } catch (error) {
      console.error("Error finding chat:", error);
    }
    // No existing chat found, will be created on first message
    return null;
  }, []);

  // Effect to find chat and load messages
  useEffect(() => {
    if (!currentUser || !otherUser) return;
    
    setMessagesLoading(true);
    findOrCreateChat(currentUser.$id, otherUser.$id).then(foundChatId => {
      if (foundChatId) {
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
          Query.equal('chatId', foundChatId),
          Query.orderAsc('$createdAt'),
          Query.limit(100) // Load last 100 messages
        ]).then(response => {
          setMessages(response.documents as Message[]);
        }).catch(error => {
          console.error("Failed to fetch messages:", error);
          toast({ variant: 'destructive', title: 'Error loading messages' });
        }).finally(() => {
          setMessagesLoading(false);
        });
      } else {
        setMessages([]);
        setMessagesLoading(false);
      }
    });

  }, [currentUser, otherUser, findOrCreateChat, toast]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`, response => {
      const newMessage = response.payload as Message;
      if (response.events.includes('databases.*.collections.*.documents.*.create') && newMessage.chatId === chatId) {
        setMessages(prev => [...prev, newMessage]);
      }
      if (response.events.includes('databases.*.collections.*.documents.*.delete') && newMessage.chatId === chatId) {
        setMessages(prev => prev.filter(m => m.$id !== newMessage.$id));
      }
    });

    return () => unsubscribe();
  }, [chatId]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSendMessage = async (mediaUrl?: string, type?: Message['mediaType']) => {
    if ((!inputText.trim() && !mediaUrl) || !currentUser || !otherUser) return;
    setIsSending(true);

    const messageText = inputText.trim();
    setInputText('');
    
    let currentChatId = chatId;

    try {
      // 1. Create chat document if it doesn't exist
      if (!currentChatId) {
        const sortedParticipants = [currentUser.$id, otherUser.$id].sort();
        const newChatDoc = await databases.createDocument(
            DATABASE_ID, 
            COLLECTION_ID_CHATS, 
            ID.unique(), {
          participants: sortedParticipants,
          lastMessage: messageText || `Sent a ${type}`,
          lastMessageAt: new Date().toISOString(),
        });
        currentChatId = newChatDoc.$id;
        setChatId(currentChatId);
      }
      
      if (!currentChatId) throw new Error("Failed to create or find chat.");

      // 2. Create message document
      const messagePayload: any = {
        chatId: currentChatId,
        senderId: currentUser.$id,
        status: 'sent',
      };

      if (mediaUrl && type) {
          messagePayload.mediaUrl = mediaUrl;
          messagePayload.mediaType = type;
          if (messageText) messagePayload.text = messageText;
      } else {
          messagePayload.text = messageText;
          messagePayload.mediaType = 'text';
      }

      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), messagePayload);

      // 3. Update chat with last message
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, currentChatId, {
        lastMessage: messageText || `Sent a ${type}`,
        lastMessageAt: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error("Send message error:", error);
      toast({ variant: 'destructive', title: 'Failed to send message', description: error.message });
      setInputText(messageText); // Restore input on failure
    } finally {
      setIsSending(false);
    }
  };


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({ title: 'Uploading...', description: 'Your file is being uploaded.' });
    setIsSending(true);
    try {
        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
        const fileUrl = getAppwriteStorageUrl(uploadResult.$id);

        await handleSendMessage(fileUrl, fileTypeRef.current);
    } catch (error) {
        toast({ title: 'Upload Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setIsSending(false);
    }
  };
  
  const handleDeleteMessage = async (messageId: string) => {
     try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, messageId);
        // Realtime subscription will handle removing from UI
        toast({ title: 'Message deleted' });
     } catch(error) {
        toast({ title: 'Failed to delete message', variant: 'destructive' });
     }
  };
  
  const MessageStatus = ({ status }: { status: Message['status'] }) => {
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" />;
    if (status === 'sent') return <Check className="h-4 w-4" />;
    return null;
  };
  
  const isLoading = userLoading || otherUserLoading;
  
  const openFilePicker = (type: Message['mediaType']) => {
      fileTypeRef.current = type;
      fileInputRef.current?.click();
  }

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
                <div className="flex-1 p-4 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
          </div>
      )
  }

  const renderMedia = (msg: Message) => {
      if (!msg.mediaUrl || !msg.mediaType) return null;
      switch(msg.mediaType) {
          case 'image': return <ImageIcon className="h-10 w-10 text-muted-foreground"/> 
          case 'video': return <Video className="h-10 w-10 text-muted-foreground"/>
          case 'audio': return <Headphones className="h-10 w-10 text-muted-foreground"/>
          case 'file': return <File className="h-10 w-10 text-muted-foreground"/>
          default: return null;
      }
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
              <AvatarImage src={otherUser?.avatar} />
              <AvatarFallback>{(otherUser?.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
            <h2 className="font-semibold">{otherUser?.username || 'User'}</h2>
            {/* Realtime online status would require presence tracking, simplified for now */}
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
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messagesLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : messages.length === 0 ? (
            <p className='text-center text-muted-foreground'>No messages yet. Say hello!</p>
        ) : (
            messages.map((msg) => (
                <DropdownMenu key={msg.$id}>
                    <DropdownMenuTrigger asChild>
                    <div
                        className={cn(
                        'flex max-w-[75%] flex-col gap-1',
                        msg.senderId === currentUser?.$id ? 'ml-auto items-end' : 'mr-auto items-start'
                        )}
                    >
                        <div
                        className={cn(
                            'rounded-lg px-3 py-2',
                            msg.senderId === currentUser?.$id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                        >
                          {msg.mediaUrl && msg.mediaType === 'image' ? (
                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.mediaUrl} alt="sent image" className="max-w-xs rounded-md" />
                                </a>
                          ) : msg.mediaUrl && msg.mediaType === 'audio' ? (
                                <audio controls src={msg.mediaUrl} className="max-w-xs" />
                          ) : msg.mediaUrl ? (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                              {renderMedia(msg)} <span>{msg.text || msg.mediaType}</span>
                            </a>
                          ) : null}

                          {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs px-1">
                            <span>{format(new Date(msg.$createdAt), 'p')}</span>
                            {msg.senderId === currentUser?.$id && <MessageStatus status={msg.status} />}
                        </div>
                    </div>
                    </DropdownMenuTrigger>
                    {msg.senderId === currentUser?.$id && (
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleDeleteMessage(msg.$id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete for Me</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    )}
                </DropdownMenu>
            ))
        )}
        <div ref={chatBottomRef} />
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
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
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
                    <DropdownMenuItem onClick={() => openFilePicker('image')}><ImageIcon className="mr-2 h-4 w-4" /><span>Image</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openFilePicker('video')}><Video className="mr-2 h-4 w-4" /><span>Video</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openFilePicker('file')}><File className="mr-2 h-4 w-4" /><span>Document</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openFilePicker('audio')}><Headphones className="mr-2 h-4 w-4" /><span>Audio</span></DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => toast({ title: 'Voice messages coming soon!'})}>
                <Mic />
            </Button>
            <Button size="icon" onClick={() => handleSendMessage()} disabled={isSending || !inputText.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
            </Button>
            </div>
        )}
      </footer>
    </div>
  );
}
