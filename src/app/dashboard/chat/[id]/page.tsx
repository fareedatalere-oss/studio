'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mic, Paperclip, Send, Check, CheckCheck, MoreVertical, Trash2, X, File,
  ImageIcon, Loader2, Edit, Forward,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_PROFILES, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useParams } from 'next/navigation';

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

export default function ChatThreadPage() {
  const params = useParams();
  const otherUserId = params.id as string;
  const { toast } = useToast();
  const { user: currentUser, profile: currentUserProfile, loading: userLoading } = useUser();
  
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

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
        Query.equal('participants', sortedParticipants)
      ]);
      const existingChat = response.documents[0];
      if (existingChat) {
        setChatId(existingChat.$id);
        return existingChat.$id;
      }
    } catch (error) { console.error("Error finding chat:", error); }
    return null;
  }, []);

  useEffect(() => {
    if (!otherUserId || !currentUser?.$id || !currentUserProfile) return;

    databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId)
      .then(profile => {
        setOtherUser(profile);
        setIsBlockedByMe(currentUserProfile.blockedUsers?.includes(otherUserId) || false);
        setAmIBlocked(profile.blockedUsers?.includes(currentUser.$id) || false);
      })
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Could not load user profile.' }));

    setMessagesLoading(true);
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

    const presenceUnsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_PROFILES}.documents.${otherUserId}`, response => {
      const updatedProfile = response.payload as any;
      setOtherUser(prev => ({...prev, ...updatedProfile}));
      setAmIBlocked(updatedProfile.blockedUsers?.includes(currentUser.$id) || false);
      
      const lastSeen = new Date(updatedProfile.lastSeen).getTime();
      const now = new Date().getTime();
      const isNowOnline = (now - lastSeen) < 60 * 1000;
      setIsOtherUserOnline(isNowOnline);

      if (isNowOnline && chatId) {
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
            Query.equal('chatId', chatId),
            Query.equal('senderId', currentUser.$id),
            Query.equal('status', 'sent')
        ]).then(res => {
            const updates = res.documents.map(m => 
                databases.updateDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, m.$id, { status: 'delivered' })
            );
            Promise.all(updates).catch(err => console.error("Failed to upgrade messages to delivered:", err));
        });
      }
    });
    
    const selfUnsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_PROFILES}.documents.${currentUser.$id}`, response => {
      const myProfile = response.payload as any;
      setIsBlockedByMe(myProfile.blockedUsers?.includes(otherUserId) || false);
    });

    const updatePresence = () => {
        if (document.visibilityState === 'visible') {
            databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id, { lastSeen: new Date().toISOString() });
        }
    }
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30 * 1000);

    return () => {
      presenceUnsubscribe();
      selfUnsubscribe();
      clearInterval(presenceInterval);
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
        setMessages(prev => prev.filter(m => m.$id !== payload.$id));
      }
    });
    return () => messagesUnsubscribe();
  }, [chatId]);
  
  useEffect(() => {
    if (!chatId || !currentUser?.$id || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (m) => m.senderId === otherUserId && m.status !== 'read'
    );

    if (unreadMessages.length > 0) {
      const updates = unreadMessages.map((m) =>
        databases.updateDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, m.$id, {
          status: 'read',
        })
      );
      Promise.all(updates).catch((err) => {
        console.error('Failed to mark messages as read:', err);
      });
    }
  }, [messages, chatId, currentUser, otherUserId]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- Actions ---

  const handleSendMessage = async (text: string, file?: File, type?: Message['mediaType']) => {
    if ((!text.trim() && !file) || !currentUser || !otherUser) return;
    setIsSending(true);

    try {
      let mediaUrl: string | undefined = undefined;
      if (file && type) {
        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
        mediaUrl = getAppwriteStorageUrl(uploadResult.$id);
      }

      let currentChatId = chatId;
      if (!currentChatId) {
        const sortedParticipants = [currentUser.$id, otherUser.$id].sort();
        const existingChats = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
            Query.equal('participants', sortedParticipants)
        ]);
        if (existingChats.documents[0]) {
            currentChatId = existingChats.documents[0].$id;
        } else {
            const newChatDoc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, ID.unique(), { participants: sortedParticipants, lastMessage: '...', lastMessageAt: new Date().toISOString() });
            currentChatId = newChatDoc.$id;
        }
        setChatId(currentChatId);
      }
      if (!currentChatId) throw new Error("Failed to create or find chat.");

      const messagePayload: any = { 
          chatId: currentChatId, 
          senderId: currentUser.$id, 
          status: isOtherUserOnline ? 'delivered' : 'sent',
          text: text.trim(),
          mediaUrl: mediaUrl,
          mediaType: type || 'text'
      };

      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), messagePayload);
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, currentChatId, { lastMessage: text.trim() || `Sent a ${type}`, lastMessageAt: new Date().toISOString() });

      setInputText('');
      setAudioPreview(null);
    } catch (error: any) {
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

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!currentUser) return;
    try {
      if (forEveryone) {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, messageId);
      } else {
        const message = messages.find(m => m.$id === messageId);
        const currentDeletedFor = message?.deletedFor || [];
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, messageId, {
          deletedFor: [...currentDeletedFor, currentUser.$id]
        });
      }
      toast({ title: 'Message deleted' });
    } catch(error) { toast({ title: 'Failed to delete message', variant: 'destructive' }); }
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
    handleSendMessage('', file, fileTypeRef.current);
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
    await handleSendMessage(inputText, audioFile, 'audio');
  };
  
  const MessageStatus = ({ status, isSender }: { status: Message['status'], isSender: boolean }) => {
    if (!isSender) return null;
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" />;
    if (status === 'sent') return <Check className="h-4 w-4" />;
    return null;
  };
  
  const isLoading = userLoading || !otherUser || !currentUserProfile;
  const openFilePicker = (type: 'image' | 'file') => {
      fileTypeRef.current = type;
      fileInputRef.current?.click();
  }
  const visibleMessages = messages.filter(m => !m.deletedFor?.includes(currentUser?.$id ?? ''));

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-16 md:top-0 bg-background border-b flex items-center justify-between gap-3 p-3">
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
            <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', isOtherUserOnline ? 'bg-green-500' : 'bg-gray-400')}></span>
                <p className="text-xs text-muted-foreground">{isOtherUserOnline ? 'Online' : (otherUser?.lastSeen ? `Last seen ${formatDistanceToNowStrict(new Date(otherUser.lastSeen), {addSuffix: true})}` : 'Offline')}</p>
            </div>
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
                <DropdownMenu key={msg.$id}>
                    <DropdownMenuTrigger asChild>
                    <div className={cn('flex max-w-[75%] flex-col gap-1', isSender ? 'ml-auto items-end' : 'mr-auto items-start' )}>
                        <div className={cn('rounded-lg px-3 py-2', isSender ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                          {msg.mediaUrl && msg.mediaType === 'image' ? (
                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.mediaUrl} alt="sent image" className="max-w-xs rounded-md" />
                                </a>
                          ) : msg.mediaUrl && msg.mediaType === 'audio' ? (
                                <audio controls src={msg.mediaUrl} className="max-w-xs" />
                          ) : msg.mediaUrl ? (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                              <File className="h-10 w-10 text-muted-foreground"/> <span>{msg.text || msg.mediaType}</span>
                            </a>
                          ) : null}
                          {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs px-1">
                            {msg.isEdited && <span>(edited)</span>}
                            <span>{format(new Date(msg.$createdAt), 'p')}</span>
                            <MessageStatus status={msg.status} isSender={isSender} />
                        </div>
                    </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => toast({ title: 'Coming soon!' })}><Forward className="mr-2 h-4 w-4" /><span>Forward</span></DropdownMenuItem>
                         {isSender && msg.mediaType === 'text' && (
                            <DropdownMenuItem onClick={() => handleStartEdit(msg)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                         )}
                         <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete...</span></DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Message?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter className='sm:flex-col sm:space-x-0 gap-2'>
                                    {isSender && <AlertDialogAction onClick={() => handleDeleteMessage(msg.$id, true)} className='bg-destructive hover:bg-destructive/80'>Delete for Everyone</AlertDialogAction>}
                                    <AlertDialogAction onClick={() => handleDeleteMessage(msg.$id, false)} variant="outline">Delete for Me</AlertDialogAction>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            )})
        )}
        <div ref={chatBottomRef} />
      </div>

      <footer className="sticky bottom-16 md:bottom-0 bg-background border-t p-3">
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
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/*" />
            <Textarea
                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                value={inputText} onChange={(e) => setInputText(e.target.value)} rows={1}
                className="resize-none min-h-[40px] max-h-[120px]"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editingMessage ? handleEdit() : handleSendMessage(inputText); } }}
            />
             {inputText ? (
                <Button size="icon" onClick={() => editingMessage ? handleEdit() : handleSendMessage(inputText)} disabled={isSending}>{isSending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
             ) : (
                <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Paperclip /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openFilePicker('image')}><ImageIcon className="mr-2 h-4 w-4" /><span>Image</span></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openFilePicker('file')}><File className="mr-2 h-4 w-4" /><span>Document</span></DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={startRecording}><Mic /></Button>
                </>
             )}
            </div>
        )}
      </footer>
    </div>
  );
}
