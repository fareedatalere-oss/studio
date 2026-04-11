
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhoneOff, Loader2, MessageSquare, Video, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, client } from '@/lib/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Pure White Call Page.
 * Handles "Ringing" and "Connected" states with cinematic White UI.
 * Connects directly to the user's instructions and hand-drawn pick-up sketch.
 */

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            
            const partnerId = data.invitedUsers?.[0] === user?.$id ? data.hostId : data.invitedUsers?.[0];
            if (partnerId) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
        } catch (e) {
            router.replace('/dashboard/chat');
        }
    }, [callId, user?.$id, router]);

    useEffect(() => {
        fetchCall();
        const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${callId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') {
                router.replace('/dashboard/chat');
            }
            setCall(payload);
        });
        return () => {
            unsub();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callId, fetchCall, router]);

    // Timer logic - only starts when status is 'connected'
    useEffect(() => {
        if (call?.status === 'connected') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [call?.status]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleHangUp = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'ended' });
        router.replace('/dashboard/chat');
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

    const isConnected = call.status === 'connected';

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-24 font-body overflow-hidden">
            <header className="absolute top-16 left-0 right-0 text-center">
                {isConnected ? (
                    <div className="space-y-1">
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-in fade-in">Connected</p>
                        <p className="text-lg font-black text-black/40">{formatDuration(duration)}</p>
                    </div>
                ) : (
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">
                        {call.hostId === user?.$id ? 'Calling...' : 'Ringing...'}
                    </p>
                )}
            </header>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full px-6">
                <div className="relative">
                    <div className={cn(
                        "absolute inset-0 bg-primary/5 rounded-full -m-6",
                        isConnected ? "animate-none" : "animate-ping"
                    )}></div>
                    <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
                        <AvatarImage src={partner.avatar} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white text-5xl font-black">{partner.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-black text-2xl font-black tracking-tighter">@{partner.username}</h2>
                    {!isConnected && <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">I-Pay Secure Line</p>}
                </div>
            </div>

            <footer className="w-full max-w-sm px-10 flex flex-col items-center gap-8">
                {isConnected && (
                    <div className="flex items-center justify-center gap-10 w-full animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex flex-col items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted border hover:bg-primary hover:text-white transition-all">
                                <MessageSquare className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40">Chat</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted border hover:bg-primary hover:text-white transition-all">
                                <Video className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40">Video</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted border hover:bg-primary hover:text-white transition-all">
                                <Layout className="h-5 w-5" />
                            </Button>
                            <span className="text-[8px] font-black uppercase opacity-40">Display</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center gap-3">
                    <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                        <PhoneOff className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Hang up</span>
                </div>
            </footer>
        </div>
    );
}
