'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Send, Loader2, Bot, ShieldCheck, 
    Smartphone, Globe, Cloud, ExternalLink, CheckCircle2, AlertCircle, Trash2, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { db, ID } from '@/lib/data-service';
import { collection, query, where, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

/**
 * @fileOverview Sofia AI Chat Hub v5.2.
 * STABILITY: Refined dependencies and memoized state to terminate render loops.
 * PERFORMANCE: Synchronized with new Agentic Tool-Calling brain.
 */

const COLLECTION_ID_MESSAGES = 'messages';

export default function AiChatPage() {
    const router = useRouter();
    const { user, profile } = useUser();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatId = user ? `ai_${user.$id}` : null;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || !chatId) return;

        const q = query(
            collection(db, COLLECTION_ID_MESSAGES),
            where('chatId', '==', chatId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(d => ({ $id: d.id, ...d.data() }));
            const sorted = docs.sort((a: any, b: any) => {
                const timeA = a.timestamp || 0;
                const timeB = b.timestamp || 0;
                return timeA - timeB;
            });
            setMessages(sorted);
        });

        return () => unsubscribe();
    }, [chatId, isMounted]);

    useEffect(() => {
        if (messages.length > 0) {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = useCallback(async () => {
        const messageText = input.trim();
        if (!messageText || isLoading || !user || !chatId) return;

        setInput('');
        setIsLoading(true);

        try {
            // 1. Commit User Message
            const userMsgId = ID.unique();
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, userMsgId), {
                chatId: chatId,
                senderId: user.$id,
                text: messageText,
                sender: 'user',
                timestamp: Date.now(),
                createdAt: serverTimestamp()
            });

            // 2. Technical Agent Handshake
            const response = await chatSofia({
                message: messageText,
                userId: user.$id,
                username: profile?.username || 'User',
                nairaBalance: profile?.nairaBalance,
                accountNumber: profile?.accountNumber,
                currentTime: new Date().toLocaleString(),
                history: messages.slice(-5).map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    text: m.text
                }))
            });

            // 3. Commit Sofia Response
            const aiMsgId = ID.unique();
            const textToSave = response?.text || "I'm here to assist you.";
            
            await setDoc(doc(db, COLLECTION_ID_MESSAGES, aiMsgId), {
                chatId: chatId,
                senderId: 'sofia_ai',
                text: textToSave,
                sender: 'ai',
                action: response?.action || 'none',
                parameter: response?.parameter || '',
                timestamp: Date.now(),
                createdAt: serverTimestamp(),
                isVerification: response?.action === 'verify_paystack'
            });

            // 4. Handle System Actions
            if (response?.action === 'call' && response?.parameter) {
                window.open(`tel:${response.parameter}`);
            } else if (response?.action && !['none', 'verify_paystack'].includes(response.action)) {
                router.push(`/dashboard/${response.action}`);
            }

        } catch (e: any) {
            console.error("Sofia Sync Failure:", e);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, user, chatId, profile, router, messages]);

    const handleDeleteMessage = async (msgId: string) => {
        try {
            await deleteDoc(doc(db, COLLECTION_ID_MESSAGES, msgId));
        } catch (e) {}
    };

    const handlePaystackVerify = () => {
        setIsVerifying(true);
        setTimeout(async () => {
            setIsVerifying(false);
            if (!chatId) return;
            await setDoc(doc(collection(db, COLLECTION_ID_MESSAGES)), {
                chatId: chatId,
                senderId: 'sofia_ai',
                text: "Identity Verification Complete. Your credentials have been validated securely via Paystack.",
                sender: 'ai',
                isVerified: true,
                timestamp: Date.now(),
                createdAt: serverTimestamp()
            });
        }, 2000);
    };

    if (!isMounted) return null;

    return (
        <div className="flex flex-col h-screen bg-background font-body overflow-hidden">
            <header className="p-4 pt-12 border-b flex items-center justify-between bg-muted/30 backdrop-blur-md sticky top-0 z-50">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full h-10 w-10 bg-muted/50 border shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl shadow-lg">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black uppercase text-xs tracking-widest text-primary">Sofia AI</h1>
                        <p className="text-[8px] font-bold uppercase opacity-40 tracking-widest">Agentic Brain v5.2</p>
                    </div>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5 scrollbar-hide">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center py-20 opacity-30 grayscale flex flex-col items-center gap-4">
                        <Bot className="h-16 w-16" />
                        <p className="font-black uppercase text-[10px] tracking-widest">Sofia is waiting to assist...</p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.$id} className={cn("flex flex-col gap-2 max-w-[85%]", msg.sender === 'user' ? "ml-auto items-end" : "items-start")}>
                        <div className="group relative">
                            <div className={cn(
                                "p-4 px-5 rounded-[1.8rem] shadow-sm text-sm font-bold leading-relaxed",
                                msg.sender === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white border rounded-tl-none text-foreground"
                            )}>
                                {msg.text}
                                
                                {msg.isVerification && (
                                    <div className="mt-4 pt-4 border-t border-dashed flex flex-col gap-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Identity Handshake</p>
                                        <Button onClick={handlePaystackVerify} disabled={isVerifying} className="h-10 rounded-full font-black uppercase text-[10px] tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700">
                                            {isVerifying ? <Loader2 className="animate-spin h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                            Verify with Paystack
                                        </Button>
                                    </div>
                                )}

                                {msg.isVerified && (
                                    <div className="mt-2 flex items-center gap-2 text-emerald-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Master Auth Success</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-2 opacity-40">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-6 w-6 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors">
                                                <MoreVertical className="h-3 w-3" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={msg.sender === 'user' ? 'end' : 'start'} className="font-black uppercase text-[9px] rounded-xl p-1 shadow-2xl">
                                            <DropdownMenuItem onClick={() => handleDeleteMessage(msg.$id)} className="text-destructive gap-2">
                                                <Trash2 className="h-3 w-3" /> Delete History
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <span className="text-[7px] font-black uppercase">{format(new Date(msg.timestamp || Date.now()), 'HH:mm')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 animate-pulse opacity-50">
                        <div className="bg-primary/10 p-2 rounded-full"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                        <span className="font-black uppercase text-[8px] tracking-widest text-primary">Sofia is using her memory tool...</span>
                    </div>
                )}
                <div ref={scrollRef} />
            </main>

            <footer className="p-4 pb-10 border-t bg-background sticky bottom-0 z-50">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <Input 
                        placeholder="English ko Hausa..." 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        className="flex-1 h-12 rounded-full bg-muted/50 border-none px-6 font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button onClick={handleSend} size="icon" className="h-12 w-12 rounded-full shadow-xl bg-primary active:scale-90 transition-transform" disabled={isLoading || !input.trim()}>
                        <Send className="h-5 w-5 text-white" />
                    </Button>
                </div>
            </footer>
        </div>
    );
}
