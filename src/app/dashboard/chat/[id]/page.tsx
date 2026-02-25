
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mic, Paperclip, Send, Check, CheckCheck, MoreVertical, Trash2, X, File as FileIcon,
  ImageIcon, Loader2, Edit, Forward, CircleDollarSign
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID, Query, Permission, Role } from 'appwrite';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useParams } from 'next/navigation';
import { getBankList, makeBankTransfer } from '@/app/actions/flutterwave';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Message = {
  $id: string;
  chatId: string;
  text?: string;
  senderId: string;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file' | 'text';
  isEdited?: boolean;
  deletedFor?: string[];
  $createdAt: string;
};

type Bank = {
    id: number;
    code: string;
    name: string;
};

const SendMoneyDialog = ({ currentUser, otherUser }: { currentUser: any, otherUser: any }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [banks, setBanks] = useState<Bank[]>([]);
    
    useEffect(() => {
        getBankList().then(result => {
            if (result.success) setBanks(result.data);
        });
    }, []);

    const handleSend = async () => {
        if (!currentUser || !otherUser || !otherUser.accountNumber) return;
        
        const bank = banks.find(b => b.name === otherUser.bankName);
        if (!bank) {
            toast({ variant: 'destructive', title: 'Error', description: "Recipient's bank is not supported for transfers." });
            return;
        }

        setIsProcessing(true);
        const result = await makeBankTransfer({
            userId: currentUser.$id,
            pin,
            bankCode: bank.code,
            accountNumber: otherUser.accountNumber,
            amount: Number(amount),
            narration: `Transfer from ${currentUser.name} via I-Pay Chat`,
            recipientName: `${otherUser.firstName} ${otherUser.lastName}`,
            bankName: otherUser.bankName,
        });

        if (result.success) {
            toast({ title: 'Success!', description: 'Your transfer has been initiated.' });
            setOpen(false);
            setAmount('');
            setPin('');
        } else {
            toast({ variant: 'destructive', title: 'Transfer Failed', description: result.message });
        }
        setIsProcessing(false);
    };

    if (!otherUser?.accountNumber) {
        return (
            <DropdownMenuItem onSelect={() => toast({ variant: 'destructive', title: 'Cannot Send Money', description: `${otherUser.username} has not set up a bank account.`})}>
                 <CircleDollarSign className="mr-2 h-4 w-4" />
                <span>Send Money</span>
            </DropdownMenuItem>
        );
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <CircleDollarSign className="mr-2 h-4 w-4" />
                    <span>Send Money</span>
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Send Money to @{otherUser.username}</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to send money to {otherUser.firstName} {otherUser.lastName} ({otherUser.bankName} - {otherUser.accountNumber}).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₦)</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 5000" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pin">Your 5-Digit PIN</Label>
                        <Input id="pin" type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSend} disabled={isProcessing || !amount || pin.length !== 5}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Send
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function ChatThreadPage() {
  const params = useParams();
  const otherUserId = params.id as string;
  const { toast } = useToast();
  const { user: currentUser, profile: currentUserProfile, loading: userLoading } = useUser();
  
  const [otherUser, setOtherUser] = useState<any>(null);

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<'image' | 'file'>('file');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching and Realtime ---

    const findChatId = useCallback(async (currentUId: string, otherUId: string) => {
        const sortedParticipants = [currentUId, otherUId].sort();
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
                Query.equal('participants', sortedParticipants),
                Query.limit(1)
            ]);
            if (response.documents.length > 0) {
                const foundChatId = response.documents[0].$id;
                setChatId(foundChatId);
                return foundChatId;
            }
        } catch (error) {
            console.error("Error finding chat:", error);
        }
        return null;
    }, []);

  useEffect(() => {
    if (!otherUserId || !currentUser?.$id || !currentUserProfile) return;
    
    // Clear old state when user changes
    setMessages([]);
    setChatId(null);
    setMessagesLoading(true);

    databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId)
      .then(profile => {
        setOtherUser(profile);
        setIsBlockedByMe(currentUserProfile.blockedUsers?.includes(otherUserId) || false);
        setAmIBlocked(profile.blockedUsers?.includes(currentUser.$id) || false);
      })
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Could not load user profile.' }));

    findChatId(currentUser.$id, otherUserId).then(foundChatId => {
      if (foundChatId) {
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
          Query.equal('chatId', foundChatId),
          Query.orderAsc('$createdAt'),
          Query.limit(100)
        ]).then(response => {
          setMessages(response.documents as Message[]);
        }).catch(() => toast({ variant: 'destructive', title: 'Error loading messages' }))
          .finally(() => setMessagesLoading(false));
      } else {
        setMessages([]);
        setMessagesLoading(false);
      }
    });
  }, [otherUserId, currentUser, currentUserProfile, findChatId, toast]);

  // Realtime subscriptions
  useEffect(() => {
    if (!currentUser?.$id || !otherUserId) return;
    
    const selfUnsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_PROFILES}.documents.${currentUser.$id}`, response => {
      const myProfile = response.payload as any;
      setIsBlockedByMe(myProfile.blockedUsers?.includes(otherUserId) || false);
    });

    return () => {
      selfUnsubscribe();
    };
  }, [currentUser, otherUserId, chatId]);

  useEffect(() => {
    if (!chatId) return;
    const messagesUnsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`, response => {
      const payload = response.payload as Message;
      if (payload.chatId !== chatId) return;
      
      const eventType = response.events[0];
      if (eventType.includes('.create')) {
        setMessages(prev => prev.find(m => m.$id === payload.$id) ? prev : [...prev, payload]);
      } else if (eventType.includes('.update')) {
        setMessages(prev => prev.map(m => m.$id === payload.$id ? payload : m));
      } else if (eventType.includes('.delete')) {
        // This is handled optimistically on the client, but this ensures sync
        setMessages(prev => prev.filter(m => m.$id !== payload.$id));
      }
    });
    return () => messagesUnsubscribe();
  }, [chatId]);
  
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- Actions ---
    const getOrCreateChat = useCallback(async (currentUserId: string, otherUserId: string): Promise<string> => {
        const sortedParticipants = [currentUserId, otherUserId].sort();
        
        // 1. Try to find existing chat
        const existingChats = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
            Query.equal('participants', sortedParticipants),
            Query.limit(1)
        ]);

        if (existingChats.documents.length > 0) {
            return existingChats.documents[0].$id;
        }

        // 2. If not found, create it
        const newChatDoc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID_CHATS,
            ID.unique(),
            { participants: sortedParticipants, lastMessage: '', lastMessageAt: new Date().toISOString() }
        );
        return newChatDoc.$id;
    }, []);

  const handleSendMessage = async (text: string, file?: File, type?: Message['mediaType']) => {
    if ((!text || !text.trim()) && !file) return;
    if (!currentUser?.$id || !otherUser?.$id) {
        toast({ variant: 'destructive', title: 'Error', description: "Cannot send message. User or recipient not found." });
        return;
    }

    setIsSending(true);

    try {
        const currentChatId = await getOrCreateChat(currentUser.$id, otherUser.$id);
        if (!chatId) setChatId(currentChatId);
        
        let mediaUrl: string | undefined = undefined;
        if (file && type) {
            const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            mediaUrl = getAppwriteStorageUrl(uploadResult.$id);
        }
        
        const messagePayload: any = {
            chatId: currentChatId,
            senderId: currentUser.$id,
            status: 'sent',
            text: text.trim(),
            mediaUrl: mediaUrl,
            mediaType: type || 'text'
        };

        await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID_MESSAGES,
            ID.unique(),
            messagePayload
        );

        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, currentChatId, {
            lastMessage: text.trim() || `Sent a ${type}`,
            lastMessageAt: new Date().toISOString()
        });

        setInputText('');
        setAudioPreview(null);
    } catch (error: any) {
        console.error("Send message error:", error);
        toast({ variant: 'destructive', title: 'Failed to send message', description: error.message });
    } finally {
        setIsSending(false);
    }
  };
  
    const handleEdit = async () => {
      if (!editingMessage || !inputText.trim()) return;
      setIsSending(true);
      try {
          await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, editingMessage.$id, { text: inputText.trim(), isEdited: true });
          setEditingMessage(null);
          setInputText('');
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Failed to edit message', description: e.message });
      } finally {
          setIsSending(false);
      }
    }

  const handleDeleteForEveryone = async (messageId: string) => {
    if (!currentUser) return;
    const messageToDelete = messages.find(m => m.$id === messageId);
    if (!messageToDelete || messageToDelete.senderId !== currentUser.$id) {
        toast({ title: 'Error', description: 'You can only delete your own messages.', variant: 'destructive' });
        return;
    }
    // Optimistic UI update
    setMessages(prev => prev.filter(m => m.$id !== messageId));
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, messageId);
        toast({ title: 'Message deleted' });
    } catch(error: any) { 
        // Revert optimistic update on failure
        setMessages(prev => [...prev, messageToDelete].sort((a,b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()));
        toast({ title: 'Failed to delete message', variant: 'destructive', description: error.message }); 
    }
  };
  
  const handleStartEdit = (message: Message) => {
    if(message.mediaType === 'text' && message.text) {
        setEditingMessage(message);
        setInputText(message.text);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUserProfile || !otherUser) return;
    const currentBlocked = currentUserProfile.blockedUsers || [];
    let newBlockedUsers: string[];

    if (isBlockedByMe) {
        newBlockedUsers = currentBlocked.filter((id: string) => id !== otherUser.$id);
        toast({ title: 'User Unblocked', description: `You can now chat with ${otherUser.username}.` });
    } else {
        newBlockedUsers = [...currentBlocked, otherUser.$id];
        toast({ title: 'User Blocked', description: `You have blocked ${otherUser.username}.` });
    }

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUserProfile.$id, {
            blockedUsers: newBlockedUsers
        });
        setIsBlockedByMe(!isBlockedByMe);
    } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update block status.' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileToSend = new File([file], file.name, { type: file.type });
    handleSendMessage('', fileToSend, fileTypeRef.current);
    e.target.value = ''; // Reset file input
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
        interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = event => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioPreview(URL.createObjectURL(audioBlob));
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Recording Error', description: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const sendAudio = async () => {
    if (!audioPreview) return;
    const audioBlob = await fetch(audioPreview).then(r => r.blob());
    const audioFile = new File([audioBlob], "voice-note.webm", { type: "audio/webm" });
    await handleSendMessage('', audioFile, 'audio');
  };
  
  const isLoading = userLoading || !otherUser || !currentUserProfile;
  const openFilePicker = (type: 'image' | 'file') => {
      fileTypeRef.current = type;
      fileInputRef.current?.click();
  }
  const visibleMessages = messages.filter(m => !m.deletedFor?.includes(currentUser?.$id ?? ''));

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3 z-10">
        <div className='flex items-center gap-3'>
            <Link href="/dashboard/chat" className="md:hidden">
                <Button variant="ghost" size="icon"><ArrowLeft /></Button>
            </Link>
            <Avatar>
              <AvatarImage src={otherUser?.avatar} />
              <AvatarFallback>{(otherUser?.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{otherUser?.username || 'User'}</h2>
            </div>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical /></Button></DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleBlockToggle}>{isBlockedByMe ? 'Unblock User' : 'Block User'}</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {isLoading || messagesLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : visibleMessages.length === 0 ? <p className='text-center text-muted-foreground'>No messages yet. Say hello!</p>
        : (
            visibleMessages.map((msg) => {
                const isSender = msg.senderId === currentUser?.$id;
                return (
                <div key={msg.$id} className={cn('group flex items-end gap-2 max-w-[75%]', isSender ? 'ml-auto flex-row-reverse' : 'mr-auto' )}>
                     <div className={cn('rounded-lg px-3 py-2', isSender ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      {msg.mediaUrl && msg.mediaType === 'image' ? (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                              <img src={msg.mediaUrl} alt="sent image" className="max-w-xs rounded-md" />
                            </a>
                      ) : msg.mediaUrl && msg.mediaType === 'audio' ? (
                            <audio controls src={msg.mediaUrl} className="max-w-xs" />
                      ) : msg.mediaUrl ? (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                          <FileIcon className="h-10 w-10 text-muted-foreground"/> <span>{msg.text || msg.mediaType}</span>
                        </a>
                      ) : null}
                      {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className='h-6 w-6 opacity-0 group-hover:opacity-100'><MoreVertical className='h-4 w-4'/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => toast({ title: 'Forwarding coming soon!' })}><Forward className="mr-2 h-4 w-4" /><span>Forward</span></DropdownMenuItem>
                                {isSender && msg.mediaType === 'text' && (
                                    <DropdownMenuItem onClick={() => handleStartEdit(msg)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                                )}
                                {isSender && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this message for everyone. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteForEveryone(msg.$id)} className='bg-destructive hover:bg-destructive/80'>Delete for Everyone</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <div className="text-muted-foreground text-xs flex items-center gap-1">
                            {msg.isEdited && <span>(edited)</span>}
                            <span>{format(new Date(msg.$createdAt), 'p')}</span>
                            {isSender && <Check className="h-4 w-4" />}
                        </div>
                    </div>
                </div>
            )})
        )}
        <div ref={chatBottomRef} />
      </div>

      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-3 z-10">
        {isBlockedByMe ? <Card className="bg-muted text-center p-3 text-sm text-muted-foreground">You blocked this user. <Button variant="link" className="p-1 h-auto" onClick={handleBlockToggle}>Unblock</Button></Card>
        : amIBlocked ? <Card className="bg-muted text-center p-3 text-sm text-muted-foreground">You can't reply to this conversation.</Card>
        : audioPreview ? (
            <div className="flex items-center gap-2">
                <Button onClick={() => setAudioPreview(null)} variant="ghost" size="icon"><Trash2 /></Button>
                <audio src={audioPreview} controls className="w-full" />
                <Button onClick={sendAudio} size="icon" disabled={isSending}>{isSending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
            </div>
        ) : isRecording ? (
             <div className="flex items-center justify-between">
                <Button onClick={stopRecording} variant="destructive" size="icon"><X/></Button>
                <p className="font-mono text-lg animate-pulse">Recording... {format(new Date(0,0,0,0,0,recordingTime), 'mm:ss')}</p>
                <Button onClick={stopRecording} size="icon"><Check/></Button>
            </div>
        ) : (
            <div className="flex items-center gap-2">
            {editingMessage && (
                <Button onClick={() => { setEditingMessage(null); setInputText(''); }} variant="ghost" size="icon"><X className="text-destructive" /></Button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/*" />
            <Textarea
                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                value={inputText} onChange={(e) => setInputText(e.target.value)} rows={1}
                className="resize-none min-h-[40px] max-h-[120px]"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editingMessage ? handleEdit() : handleSendMessage(inputText); } }}
                disabled={isLoading}
            />
             {inputText || editingMessage ? (
                <Button size="icon" onClick={() => editingMessage ? handleEdit() : handleSendMessage(inputText)} disabled={isLoading || isSending}>{isSending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
             ) : (
                <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isLoading}><Paperclip /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openFilePicker('image')}><ImageIcon className="mr-2 h-4 w-4" /><span>Image</span></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openFilePicker('file')}><FileIcon className="mr-2 h-4 w-4" /><span>Document</span></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <SendMoneyDialog currentUser={currentUser} otherUser={otherUser} />
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={startRecording} disabled={isLoading}><Mic /></Button>
                </>
             )}
            </div>
        )}
      </footer>
    </div>
  );
}

    
