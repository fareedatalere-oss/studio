'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS } from '@/lib/appwrite';
import { Models, ID, Query } from 'appwrite';
import { ArrowLeft, Send, MoreVertical, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Helper to create a consistent chat ID between two users
const getChatId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
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
    const chatId = currentUser ? getChatId(currentUser.$id, otherUserId) : null;
    
    // This effect is the core of the fix. It ensures that the Appwrite
    // subscription is properly created and, most importantly, destroyed
    // when the user navigates away or the chat changes.
    useEffect(() => {
        if (!chatId) return;

        let unsubscribe: (() => void) | undefined;

        const setupChat = async () => {
            setLoading(true);
            try {
                // Fetch other user's profile
                const otherUserProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId);
                setOtherUser(otherUserProfile);
                
                // Fetch initial messages
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                    Query.equal('chatId', chatId),
                    Query.orderAsc('$createdAt'),
                    Query.limit(100) 
                ]);
                setMessages(response.documents);

                // Subscribe to new messages for THIS CHAT ONLY
                unsubscribe = account.client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`, (response) => {
                    const createdMessage = response.payload as Models.Document;
                    // Only add the message if it belongs to the current chat
                    if (response.events.includes('databases.*.collections.*.documents.*.create') && createdMessage.chatId === chatId) {
                        setMessages((prevMessages) => [...prevMessages, createdMessage]);
                    }
                });

            } catch (error: any) {
                console.error('Failed to set up chat:', error);
                toast({ title: 'Error', description: `Could not load chat: ${error.message}`, variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        setupChat();

        // **THE CRITICAL CLEANUP FUNCTION**
        // This function is called automatically when the component unmounts
        // (e.g., user navigates back) or when the dependencies (chatId) change.
        // It guarantees the listener for the old chat is destroyed.
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [chatId, otherUserId, toast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chatId) return;

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        try {
            // Optimistic update for instant feedback
            const optimisticMessage: Models.Document = {
                $id: ID.unique(),
                $collectionId: COLLECTION_ID_MESSAGES,
                $databaseId: DATABASE_ID,
                $createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString(),
                $permissions: [],
                chatId: chatId,
                senderId: currentUser.$id,
                text: messageText,
            };
            setMessages(prev => [...prev, optimisticMessage]);

            // Create the message document
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

            // Update or create the chat document for recent chats list
             try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, {
                    participants: [currentUser.$id, otherUserId],
                    lastMessage: messageText,
                    lastMessageAt: new Date().toISOString(),
                });
            } catch (error: any) {
                if (error.code === 404) { // Chat document doesn't exist, create it
                    await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, {
                        participants: [currentUser.$id, otherUserId],
                        lastMessage: messageText,
                        lastMessageAt: new Date().toISOString(),
                    });
                } else {
                    throw error;
                }
            }
        } catch (error: any) {
            console.error('Failed to send message:', error);
            toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
            // Revert optimistic update
            setMessages(prev => prev.filter(m => m.$id !== optimisticMessage.$id));
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-black text-white">
            <header className="sticky top-16 md:top-0 bg-gray-900 border-b border-gray-700 flex items-center p-3 gap-3 z-10">
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
                            <p className="text-xs text-green-400">Online</p>
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
                                    ? "bg-blue-600 rounded-br-none"
                                    : "bg-gray-700 rounded-bl-none"
                            )}
                        >
                            <p className="text-sm">{message.text}</p>
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </main>

            <footer className="sticky bottom-16 md:bottom-0 bg-gray-900 border-t border-gray-700 p-3">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Type a message..."
                        className="bg-gray-800 border-gray-700 text-white"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                    />
                    <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                        {sending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </footer>
        </div>
    );
}
