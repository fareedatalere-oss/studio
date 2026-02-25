
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, getAppwriteStorageUrl, storage, BUCKET_ID_UPLOADS } from '@/lib/appwrite';
import { Models, ID, Query } from 'appwrite';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic, ImageIcon, PlayCircle, FileAudio, Trash2, Play, Pause } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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
            `databases.${DATABASE_ID}.collections.${COLLECTION_ID_PROFILES}.documents.${userId}`,
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
        return <p className="text-xs text-green-500">Online</p>;
    }

    if (presence.lastSeen) {
        return <p className="text-xs text-muted-foreground">Last seen {formatDistanceToNow(new Date(presence.lastSeen), { addSuffix: true })}</p>;
    }

    return <p className="text-xs text-muted-foreground">Offline</p>;
};


export default function ChatThreadPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useUser();
    const { toast } = useToast();

    const otherUserId = params.id as string;
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<Models.Document[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // --- Voice Recording State ---
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    // --- End Voice Recording State ---

    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;
    
    const setupRealtimeSubscription = useCallback(() => {
        if (!chatId) return;

        const realtimeTopic = `databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`;
        const unsubscribe = account.client.subscribe(realtimeTopic, (response) => {
            const createdMessage = response.payload as Models.Document;
            
            if (response.events.includes('databases.*.collections.*.documents.*.create') && createdMessage.chatId === chatId) {
                 setMessages((prevMessages) => {
                    // Check if message already exists to prevent duplicates
                    if (prevMessages.some(msg => msg.$id === createdMessage.$id)) {
                        return prevMessages;
                    }
                    return [...prevMessages, createdMessage];
                });
            }
        });

        return unsubscribe;
    }, [chatId]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
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
                
                unsubscribe = setupRealtimeSubscription();

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

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [chatId, otherUserId, toast, setupRealtimeSubscription]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Voice Recording Timer Effect ---
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
    // --- End Voice Recording Timer Effect ---

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

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chatId) return;

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        try {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                ID.unique(),
                {
                    chatId: chatId,
                    senderId: currentUser.$id,
                    text: messageText,
                }
            );
            await updateChatList(messageText);
        } catch (error: any) {
            console.error('Failed to send message:', error);
            toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
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

            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                ID.unique(),
                {
                    chatId: chatId,
                    senderId: currentUser.$id,
                    mediaUrl: mediaUrl,
                    text: specialText,
                }
            );
    
            const lastMessageText = `[${fileTypeLabel}]`;
            await updateChatList(lastMessageText);
    
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

    // --- Voice Recording Functions ---
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

    // --- End Voice Recording Functions ---

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
                             <div className="relative w-full max-w-[250px] aspect-square cursor-pointer bg-muted rounded-lg flex items-center justify-center">
                                 <Image src={message.mediaUrl} alt="chat image" layout="fill" className="rounded-lg object-cover" />
                             </div>
                        </DialogTrigger>
                        <DialogContent className="p-0 border-0 bg-black/80 w-screen h-screen max-w-none max-h-none flex items-center justify-center">
                            <Image src={message.mediaUrl} alt="chat image preview" layout="fill" className="object-contain" />
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
                            <video src={message.mediaUrl} controls autoPlay className="max-w-full max-h-full" />
                        </DialogContent>
                    </Dialog>
                );
            }
            if (mediaType.startsWith('audio/')) {
                 return (
                     <audio src={message.mediaUrl} controls className="w-full max-w-[250px]" />
                );
            }
        }
        
        // Only render text if it's a normal text message
        if (text && !text.startsWith('[media:')) {
             return <p className="text-sm whitespace-pre-wrap">{text}</p>;
        }

        return null;
    };


    return (
        <div className="flex flex-col h-full bg-white text-gray-900">
            <header className="sticky top-16 md:top-0 bg-white border-b flex items-center p-3 gap-3 z-10">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                {otherUser ? (
                    <>
                        <Avatar>
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>{otherUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">{otherUser.username}</h2>
                            <PresenceIndicator userId={otherUser.$id} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" />
                        <span>Loading...</span>
                    </div>
                )}
                <Button variant="ghost" size="icon" className="ml-auto">
                    <MoreVertical />
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                     <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : messages.map(message => (
                    <div
                        key={message.$id}
                        className={cn(
                            "flex items-end gap-2 max-w-xs md:max-w-md",
                            message.senderId === currentUser?.$id ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                    >
                        <div
                            className={cn(
                                "p-3 rounded-lg",
                                message.senderId === currentUser?.$id
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-muted rounded-bl-none"
                            )}
                        >
                            {renderMessageContent(message)}
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="sticky bottom-16 md:bottom-0 bg-white border-t p-3">
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
                            <Pause className="h-5 w-5" />
                            <span className="sr-only">Stop Recording</span>
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
                        <audio src={audioPreviewUrl} controls className="flex-1" />
                        <Button type="button" size="icon" onClick={handleSendAudio} disabled={sending}>
                             {sending ? <Loader2 className="animate-spin" /> : <Send />}
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
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => mediaInputRef.current?.click()} disabled={sending}>
                            <Paperclip />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={startRecording} disabled={sending}>
                            <Mic />
                        </Button>
                        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                            {sending ? <Loader2 className="animate-spin" /> : <Send />}
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
        </div>
    );
}
