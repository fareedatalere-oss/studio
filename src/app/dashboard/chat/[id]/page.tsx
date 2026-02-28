
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, getAppwriteStorageUrl, storage, BUCKET_ID_UPLOADS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Models, ID, Query } from 'appwrite';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, ImageIcon, PlayCircle, Trash2, Play, Pause, Forward } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';


const getChatId = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0].substring(0, 15)}_${sortedIds[1].substring(0, 15)}`;
};

const PresenceIndicator = ({ userId }: { userId: string }) => {
    const [presence, setPresence] = useState<{ isOnline: boolean; lastSeen: string | null }>({ isOnline: false, lastSeen: null });

    useEffect(() => {
        if (!userId) return;

        let isMounted = true;

        const fetchInitialPresence = async () => {
             try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
                if (isMounted && doc) {
                    setPresence({ isOnline: doc.isOnline, lastSeen: doc.lastSeen });
                }
            } catch (error) {
                console.log("Could not fetch initial presence");
            }
        };
        fetchInitialPresence();

        const unsubscribe = account.client.subscribe(
            [`databases.${DATABASE_ID}.collections.${COLLECTION_ID_PROFILES}.documents.${userId}`],
            (response) => {
                const updatedProfile = response.payload as any;
                 if (isMounted) {
                    setPresence({ isOnline: updatedProfile.isOnline, lastSeen: updatedProfile.lastSeen });
                }
            }
        );

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [userId]);

    if (presence.isOnline) {
        return <p className="text-xs text-green-500 font-bold">Online</p>;
    }

    if (presence.lastSeen) {
        return <p className="text-xs text-muted-foreground">Last seen {formatDistanceToNow(new Date(presence.lastSeen), { addSuffix: true })}</p>;
    }

    return <p className="text-xs text-muted-foreground">Offline</p>;
};

const VoiceNotePlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
    };
    
    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };
    
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current) {
            const scrubTime = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * duration;
            audioRef.current.currentTime = scrubTime;
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        const handleEnded = () => setIsPlaying(false);

        audio?.addEventListener('ended', handleEnded);
        return () => {
            audio?.removeEventListener('ended', handleEnded);
        }
    }, []);

    return (
        <div className="flex items-center gap-2 w-full max-w-[250px]">
            <audio 
                ref={audioRef} 
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
            />
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1 flex items-center gap-2">
                 <div className="relative w-full h-1.5 bg-muted rounded-full cursor-pointer" onClick={handleScrub}>
                    <div 
                        className="absolute top-0 left-0 h-full bg-primary rounded-full"
                        style={{ width: `${progress * 100}%`}}
                    />
                     <div 
                        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full"
                        style={{ left: `calc(${progress * 100}% - 6px)`}}
                    />
                </div>
            </div>
        </div>
    );
};

export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, profile: currentUserProfile } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<Models.Document[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [messageToForward, setMessageToForward] = useState<Models.Document | null>(null);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [loadingRecentChats, setLoadingRecentChats] = useState(false);

    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;
    
    const markMessagesAsRead = useCallback(async () => {
        if (!chatId || !currentUser) return;
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                Query.equal('chatId', chatId),
                Query.notEqual('senderId', currentUser.$id),
                Query.equal('status', 'sent')
            ]);

            if (response.documents.length > 0) {
                await Promise.all(response.documents.map(msg => 
                    databases.updateDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, msg.$id, { status: 'read' })
                ));
            }

            const notifRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, [
                Query.equal('userId', currentUser.$id),
                Query.equal('senderId', otherUserId),
                Query.equal('type', 'message'),
                Query.equal('isRead', false)
            ]);

            if (notifRes.documents.length > 0) {
                await Promise.all(notifRes.documents.map(notif => 
                    databases.updateDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, notif.$id, { isRead: true })
                ));
            }
        } catch (e) {
            console.log("Error marking messages as read");
        }
    }, [chatId, currentUser, otherUserId]);

    useEffect(() => {
        if (!chatId) return;

        const realtimeTopic = `databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`;
        const unsubscribe = account.client.subscribe([realtimeTopic], (response) => {
            const payload = response.payload as Models.Document;
            
            if (payload.chatId === chatId) {
                if (response.events.some(e => e.includes('.create'))) {
                    setMessages((prev) => {
                        if (prev.some(m => m.$id === payload.$id)) return prev;
                        return [...prev, payload];
                    });
                    if (payload.senderId !== currentUser?.$id) {
                        markMessagesAsRead();
                    }
                } else if (response.events.some(e => e.includes('.delete'))) {
                    setMessages((prev) => prev.filter(m => m.$id !== payload.$id));
                } else if (response.events.some(e => e.includes('.update'))) {
                    setMessages((prev) => prev.map(m => m.$id === payload.$id ? payload : m));
                }
            }
        });

        return () => unsubscribe();
    }, [chatId, currentUser?.$id, markMessagesAsRead]);

    useEffect(() => {
        const setupChat = async () => {
            if (!chatId) return;
            setLoading(true);
            try {
                const otherUserProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                setOtherUser(otherUserProfile);
                
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                    Query.equal('chatId', chatId),
                    Query.orderAsc('$createdAt'),
                    Query.limit(100) 
                ]);
                setMessages(response.documents);
                markMessagesAsRead();

            } catch (error: any) {
                console.error('Failed to set up chat:', error);
                toast({ title: 'Error', description: `Could not load chat: ${error.message}`, variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        if (chatId && otherUserId) {
            setupChat();
        }
    }, [chatId, otherUserId, toast, markMessagesAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (recordingStatus === 'recording') {
            interval = setInterval(() => {
                setRecordingTime(prevTime => prevTime + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [recordingStatus]);

    const updateChatList = async (lastMessage: string) => {
        if (!currentUser || !chatId) return;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, {
                participants: [currentUser.$id, otherUserId],
                lastMessage,
                lastMessageAt: new Date().toISOString(),
            });
        } catch (error: any) {
            if (error.code === 404) {
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, {
                    participants: [currentUser.$id, otherUserId],
                    lastMessage,
                    lastMessageAt: new Date().toISOString(),
                });
            } else {
                throw error;
            }
        }
    }

    const triggerMessageNotification = async (text: string) => {
        if (!currentUser || !otherUserId) return;
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
                userId: otherUserId,
                senderId: currentUser.$id,
                type: 'message',
                title: 'New Message',
                description: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                isRead: false,
                link: `/dashboard/chat/${currentUser.$id}`,
                createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.log("Notification trigger failed", e);
        }
    }

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chatId) return;

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        // Optimistic Update for Instant Feedback
        const tempId = ID.unique();
        const optimisticMsg = {
            $id: tempId,
            chatId: chatId,
            senderId: currentUser.$id,
            text: messageText,
            status: 'sent',
            $createdAt: new Date().toISOString()
        } as Models.Document;

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const finalDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                tempId,
                {
                    chatId: chatId,
                    senderId: currentUser.$id,
                    text: messageText,
                    status: 'sent',
                }
            );
            // Replace optimistic message with server message
            setMessages(prev => prev.map(m => m.$id === tempId ? finalDoc : m));
            
            await updateChatList(messageText);
            await triggerMessageNotification(messageText);
        } catch (error: any) {
            setMessages(prev => prev.filter(m => m.$id !== tempId));
            console.error('Failed to send message:', error);
            toast({ title: 'Error', description: `Failed to send message: ${error.message}`, variant: 'destructive' });
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };
    
    const handleSendMediaMessage = async (file: File) => {
        if (!file || !currentUser || !chatId) return;
    
        setSending(true);
        toast({ title: 'Uploading media...', description: 'Please wait.' });
    
        try {
            const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const mediaUrl = getAppwriteStorageUrl(uploadResult.$id);
            
            let fileTypeLabel = 'Media';
            if (file.type.startsWith('image/')) fileTypeLabel = 'Image';
            if (file.type.startsWith('video/')) fileTypeLabel = 'Video';
            if (file.type.startsWith('audio/')) fileTypeLabel = 'Audio';
            
            const specialText = `[media:${file.type}]`;

            const finalDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                ID.unique(),
                {
                    chatId: chatId,
                    senderId: currentUser.$id,
                    mediaUrl: mediaUrl,
                    text: specialText,
                    status: 'sent',
                }
            );
            
            setMessages(prev => [...prev, finalDoc]);
    
            const lastMessageText = `[${fileTypeLabel}]Sent a ${fileTypeLabel.toLowerCase()}`;
            await updateChatList(lastMessageText);
            await triggerMessageNotification(lastMessageText);
    
            toast({ title: 'Media sent!' });
        } catch (error: any) {
            console.error('Failed to send media message:', error);
            toast({ title: 'Error', description: `Failed to send media: ${error.message}`, variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };
    
    const handleMediaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleSendMediaMessage(e.target.files[0]);
        }
        e.target.value = '';
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            audioChunksRef.current = [];
            
            recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
    
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                setAudioPreviewUrl(URL.createObjectURL(audioBlob));
                setRecordingStatus('preview');
                stream.getTracks().forEach(track => track.stop());
            };
    
            recorder.start();
            setRecordingStatus('recording');
        } catch (error) {
            console.error("Failed to start recording:", error);
            toast({
                variant: 'destructive',
                title: 'Microphone Access Denied',
                description: 'Please enable microphone permissions in your browser settings to record voice notes.',
            });
        }
    };

    const stopRecording = () => {
        mediaRecorder?.stop();
    };

    const cancelRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        setRecordingStatus('idle');
    };
    
    const handleSendAudio = () => {
        if (audioBlob) {
            const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
            handleSendMediaMessage(audioFile);
            setRecordingStatus('idle');
            setAudioPreviewUrl(null);
            setAudioBlob(null);
        }
    };

    const handleDeletePreview = () => {
        setRecordingStatus('idle');
        setAudioPreviewUrl(null);
        setAudioBlob(null);
    };

    const handleDeleteMessage = async (messageId: string) => {
        toast({title: 'Deleting message...'});
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, messageId);
            setMessages(prev => prev.filter(msg => msg.$id !== messageId));
            toast({title: 'Message deleted'});
        } catch (error) {
            console.error("Failed to delete message", error);
            toast({title: "Error", description: "Could not delete message.", variant: 'destructive'});
        }
    };

    const handleForwardClick = (message: Models.Document) => {
        setMessageToForward(message);
    };

    const handleSendForward = async (targetChatId: string) => {
        if (!messageToForward || !currentUser) return;

        toast({ title: 'Forwarding message...' });

        try {
            const { text, mediaUrl } = messageToForward;

            const doc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                ID.unique(),
                {
                    chatId: targetChatId,
                    senderId: currentUser.$id,
                    text: `[Forwarded] ${text}`,
                    mediaUrl: mediaUrl || null,
                    status: 'sent',
                }
            );

            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, targetChatId, {
                lastMessage: `[Forwarded] ${text || 'Media'}`,
                lastMessageAt: new Date().toISOString(),
            });

            toast({ title: 'Message Forwarded' });
        } catch (error) {
            console.error("Failed to forward message:", error);
            toast({ title: "Error", description: "Could not forward message.", variant: 'destructive' });
        } finally {
            setMessageToForward(null);
        }
    };

    useEffect(() => {
        if (!messageToForward || !currentUser) return;
        
        const fetchRecent = async () => {
            setLoadingRecentChats(true);
            try {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_CHATS, [
                    Query.equal('participants', currentUser.$id),
                    Query.orderDesc('lastMessageAt')
                ]);

                const chatsWithData = await Promise.all(response.documents.map(async (chat) => {
                    const otherUserId = chat.participants.find((p: string) => p !== currentUser.$id);
                    if (!otherUserId) return null;
                    try {
                        const otherUser = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                        return { ...chat, otherUser };
                    } catch {
                        return null; 
                    }
                }));

                setRecentChats(chatsWithData.filter(Boolean));
            } catch (e) {
                console.error("Could not load recent chats for forwarding", e);
            } finally {
                setLoadingRecentChats(false);
            }
        };
        
        fetchRecent();
    }, [messageToForward, currentUser]);

    const renderMessageContent = (message: Models.Document) => {
        let mediaType: string | null = null;
        const text = message.text || '';

        if (text.startsWith('[media:')) {
            mediaType = text.slice(7, -1);
        }

        if (message.mediaUrl && mediaType) {
            if (mediaType.startsWith('image/')) {
                return (
                    <Dialog>
                        <DialogTrigger asChild>
                             <div className="relative w-full max-w-[250px] aspect-square cursor-pointer bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                 <ImageIcon className="h-16 w-16 text-muted-foreground" />
                                 <Image src={message.mediaUrl} alt="chat" fill className="object-cover" />
                             </div>
                        </DialogTrigger>
                        <DialogContent className="p-0 border-0 bg-black/80 w-screen h-screen max-w-none max-h-none flex items-center justify-center">
                            <DialogTitle className="sr-only">Image Preview</DialogTitle>
                            <Image src={message.mediaUrl} alt="chat image preview" fill className="object-contain" />
                        </DialogContent>
                    </Dialog>
                );
            }
            if (mediaType.startsWith('video/')) {
                 return (
                    <Dialog>
                        <DialogTrigger asChild>
                             <div className="relative w-full max-w-[250px] aspect-video cursor-pointer bg-black rounded-lg flex items-center justify-center">
                                <PlayCircle className="h-16 w-16 text-white" />
                             </div>
                        </DialogTrigger>
                        <DialogContent className="p-0 border-0 bg-black/90 w-screen h-screen max-w-none max-h-none flex items-center justify-center">
                            <DialogTitle className="sr-only">Video Preview</DialogTitle>
                            <video src={message.mediaUrl} controls autoPlay className="max-w-full max-h-full" />
                        </DialogContent>
                    </Dialog>
                );
            }
            if (mediaType.startsWith('audio/')) {
                return <VoiceNotePlayer src={message.mediaUrl} />;
            }
        }
        
        if (text && !text.startsWith('[media:')) {
             return <p className="text-sm whitespace-pre-wrap">{text}</p>;
        }

        return null;
    };


    return (
        <div className="flex flex-col h-full bg-white text-gray-900">
            <header className="sticky top-16 md:top-0 bg-white border-b flex items-center p-3 gap-3 z-10 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                {otherUser ? (
                    <>
                        <Avatar className="h-10 w-10 border border-primary/20">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-bold text-sm leading-none">{otherUser.username}</h2>
                            <PresenceIndicator userId={otherUserId} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span className="text-xs">Connecting...</span>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-50/50">
                {loading ? (
                     <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : messages.map(message => (
                    <div
                        key={message.$id}
                        className={cn(
                            "group flex items-end gap-2 max-w-[85%] md:max-w-[70%]",
                            message.senderId === currentUser?.$id ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                    >
                        <div
                            className={cn(
                                "p-3 rounded-2xl shadow-sm",
                                message.senderId === currentUser?.$id
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-white border rounded-bl-none"
                            )}
                        >
                            {renderMessageContent(message)}
                            <div className={cn("text-[9px] mt-1 opacity-70 flex justify-end", message.senderId === currentUser?.$id ? "text-primary-foreground" : "text-muted-foreground")}>
                                {format(new Date(message.$createdAt), 'HH:mm')}
                            </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleForwardClick(message)}>
                                        <Forward className="mr-2 h-4 w-4" /> Forward
                                    </DropdownMenuItem>
                                    {message.senderId === currentUser?.$id && (
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                                                     <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete message?</AlertDialogTitle>
                                                    <AlertDialogDescription>This message will be deleted for everyone. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteMessage(message.$id)} className="bg-destructive hover:bg-destructive/90">Delete for everyone</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="sticky bottom-16 md:bottom-0 bg-white border-t p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                {recordingStatus === 'recording' && (
                    <div className="flex items-center w-full gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={cancelRecording}
                        >
                            <Trash2 className="h-5 w-5 text-destructive" />
                            <span className="sr-only">Cancel Recording</span>
                        </Button>
                        <div className="flex-1 bg-muted rounded-full h-10 flex items-center px-4">
                            <div className="bg-red-500 h-2.5 w-2.5 rounded-full animate-pulse mr-2"></div>
                            <span className="text-sm font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
                        </div>
                        <Button type="button" size="icon" onClick={stopRecording}>
                            <Send className="h-5 w-5" />
                            <span className="sr-only">Stop and Send Recording</span>
                        </Button>
                    </div>
                )}
                {recordingStatus === 'preview' && audioPreviewUrl && (
                     <div className="flex items-center w-full gap-2">
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleDeletePreview}
                        >
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                        <audio src={audioPreviewUrl} controls className="flex-1 h-10" />
                        <Button type="button" size="icon" onClick={handleSendAudio} disabled={sending}>
                             {sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
                {recordingStatus === 'idle' && (
                    <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
                        <Input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={sending}
                            className="h-11 bg-neutral-100 border-none focus-visible:ring-primary rounded-full px-4"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => mediaInputRef.current?.click()} disabled={sending} className="h-11 w-11 rounded-full">
                            <Paperclip className="h-5 w-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={startRecording} disabled={sending} className="h-11 w-11 rounded-full">
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="h-11 w-11 rounded-full shadow-md">
                            {sending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                )}
            </footer>
             <input
                type="file"
                ref={mediaInputRef}
                onChange={handleMediaInputChange}
                className="hidden"
                accept="image/*,video/*"
            />
            <Sheet open={!!messageToForward} onOpenChange={(isOpen) => !isOpen && setMessageToForward(null)}>
                <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                    <SheetHeader>
                        <SheetTitle className="text-center font-black uppercase tracking-widest text-sm">Forward to...</SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-2 overflow-y-auto h-full">
                        {loadingRecentChats ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : recentChats.map(chat => (
                            <div key={chat.$id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={chat.otherUser.avatar} />
                                        <AvatarFallback>{chat.otherUser.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-bold">{chat.otherUser.username}</p>
                                </div>
                                <Button size="sm" onClick={() => handleSendForward(chat.$id)} className="rounded-full">
                                    <Send className="h-3 w-3 mr-2" />
                                    Send
                                </Button>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
