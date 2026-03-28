
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MESSAGES, COLLECTION_ID_PROFILES, client } from '@/lib/appwrite';
import { ID, Query, Models } from 'appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function MeetingPrivateChatPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    
    const meetingId = params.id as string;
    const otherUserId = params.userId as string;
    
    const [messages, setMessages] = useState<any[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatId = [user?.$id, otherUserId].sort().join('_') + '_' + meetingId;

    useEffect(() => {
        databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherUserId).then(setOtherUser);
        
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
            Query.equal('chatId', chatId),
            Query.orderAsc('$createdAt'),
            Query.limit(50)
        ]).then(res => setMessages(res.documents));

        const unsub = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`, response => {
            const payload = response.payload as any;
            if (payload.chatId === chatId) {
                setMessages(prev => [...prev, payload]);
            }
        });

        return () => unsub();
    }, [chatId, otherUserId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || sending) return;
        setSending(true);
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
                chatId,
                senderId: user?.$id,
                text: input.trim(),
                status: 'sent'
            });
            setInput('');
        } catch (e) {} finally { setSending(false); }
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            <header className="p-4 pt-12 border-b flex items-center gap-4 bg-muted/30 backdrop-blur-md">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={otherUser?.avatar} />
                        <AvatarFallback>{otherUser?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-black uppercase text-xs tracking-tighter">Private Chat</p>
                        <p className="text-[10px] font-bold text-muted-foreground">@{otherUser?.username}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.$id} className={cn("flex flex-col max-w-[80%]", msg.senderId === user?.$id ? "ml-auto items-end" : "items-start")}>
                        <div className={cn(
                            "p-4 rounded-2xl text-sm font-bold shadow-sm",
                            msg.senderId === user?.$id ? "bg-primary text-white rounded-tr-none" : "bg-muted rounded-tl-none"
                        )}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </main>

            <footer className="p-4 border-t bg-background">
                <form onSubmit={handleSend} className="flex gap-2">
                    <Input 
                        placeholder="Type text only..." 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        className="rounded-full h-12 bg-muted border-none px-6 font-bold"
                    />
                    <Button size="icon" type="submit" className="h-12 w-12 rounded-full" disabled={sending || !input.trim()}>
                        {sending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </footer>
        </div>
    );
}
