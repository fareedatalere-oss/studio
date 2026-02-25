'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, getAppwriteStorageUrl, storage, BUCKET_ID_UPLOADS } from '@/lib/appwrite';
import { Models, ID, Query } from 'appwrite';
import { ArrowLeft, Send, MoreVertical, Loader2, Paperclip, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
                if (isMounted) {
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
    const audioInputRef = useRef<HTMLInputElement>(null);

    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;
    
    const setupRealtimeSubscription = useCallback(() => {
        if (!chatId) return;

        const realtimeTopic = `databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`;
        const unsubscribe = account.client.subscribe(realtimeTopic, (response) => {
            const createdMessage = response.payload as Models.Document;
            
            if (response.events.includes('databases.*.collections.*.documents.*.create') && createdMessage.chatId === chatId) {
                 setMessages((prevMessages) => {
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

        setupChat();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [chatId, otherUserId, toast, setupRealtimeSubscription]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                    status: 'sent',
                    type: 'text'
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
            
            let messageType = 'image';
            if (file.type.startsWith('video/')) messageType = 'video';
            if (file.type.startsWith('audio/')) messageType = 'audio';
    
            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_MESSAGES,
                ID.unique(),
                {
                    chatId: chatId,
                    senderId: currentUser.$id,
                    mediaUrl: mediaUrl,
                    status: 'sent',
                    type: messageType,
                }
            );
    
            const lastMessageText = `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)}]`;
            await updateChatList(lastMessageText);
    
            toast({ title: 'Media sent!' });
        } catch (error: any) {
            console.error('Failed to send media message:', error);
            toast({ title: 'Error', description: 'Failed to send media.', variant: 'destructive' });
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

    const renderMessageContent = (message: Models.Document) => {
        switch (message.type) {
            case 'image':
                return (
                    <div className="relative w-full max-w-[250px] aspect-square">
                        <Image src={message.mediaUrl} alt="chat image" layout="fill" className="rounded-lg object-cover" />
                    </div>
                );
            case 'video':
                return <video src={message.mediaUrl} controls className="max-w-xs rounded-lg" />;
            case 'audio':
                return <audio src={message.mediaUrl} controls className="w-full" />;
            default:
                return <p className="text-sm">{message.text}</p>;
        }
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => audioInputRef.current?.click()} disabled={sending}>
                        <Mic />
                    </Button>
                    <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                        {sending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </footer>
             <input
                type="file"
                ref={mediaInputRef}
                onChange={handleMediaInputChange}
                className="hidden"
                accept="image/*,video/*"
            />
            <input
                type="file"
                ref={audioInputRef}
                onChange={handleMediaInputChange}
                className="hidden"
                accept="audio/*"
            />
        </div>
    );
}
