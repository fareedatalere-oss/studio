'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Video, X, Send, 
    Mic, MicOff, MessageSquare, MonitorPlay, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, client } from '@/lib/data-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Private Call Page.
 * CALLER (A): Sees receiver (B) name/icon.
 * RECEIVER (B): Sees caller (A) name/icon.
 * UI: Shows 'chat', 'display', 'video' buttons under identity.
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
            
            // Logic to find "The Other Person"
            const partnerId = data.hostId === user?.$id ? data.invitedUsers[0] : data.hostId;
            if (partnerId) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
        } catch (e) {}
    }, [callId, user?.$id]);

    useEffect(() => {
        fetchCall();
        const unsubCall = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${callId}`], response => {
            const payload = response.payload as any;
            if (payload.$id === callId) {
                if (payload.status === 'ended' || payload.status === 'cancelled') {
                    router.replace('/dashboard/chat');
                    return;
                }
                setCall(payload);
            }
        });
        return () => { unsubCall(); if (timerRef.current) clearInterval(timerRef.current); };
    }, [callId, fetchCall, router]);

    useEffect(() => {
        if (call?.status === 'connected' && !timerRef.current) {
            timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
        }
    }, [call?.status]);

    const handleHangUp = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'ended' });
        router.replace('/dashboard/chat');
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

    const isConnected = call.status === 'connected';
    const isOutgoing = call.hostId === user?.$id;

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-24 font-body overflow-hidden relative">
            <header className="absolute top-16 left-0 right-0 text-center z-50">
                <div className="space-y-1">
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">
                        {isConnected ? 'Secure Line' : 'Handshake...'}
                    </p>
                    <p className="text-lg font-black text-black/40">{isConnected ? formatDuration(duration) : 'Identity Check'}</p>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full px-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping scale-150"></div>
                    <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl relative z-10">
                        <AvatarImage src={partner.avatar} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white text-5xl font-black">{partner.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="text-center space-y-6">
                    <div>
                        <h2 className="text-black text-2xl font-black tracking-tighter uppercase">@{partner.username}</h2>
                        <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest">End-to-End Encrypted</p>
                    </div>

                    <div className="flex items-center justify-center gap-4 animate-in fade-in zoom-in">
                        <Button variant="outline" size="sm" className="h-10 rounded-full font-black uppercase text-[8px] gap-2 px-6">
                            <MessageSquare className="h-3.5 w-3.5" /> chat
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-full font-black uppercase text-[8px] gap-2 px-6">
                            <MonitorPlay className="h-3.5 w-3.5" /> display
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-full font-black uppercase text-[8px] gap-2 px-6">
                            <Video className="h-3.5 w-3.5" /> video
                        </Button>
                    </div>
                </div>
            </div>

            <footer className="w-full max-sm px-10 flex flex-col items-center gap-4 z-50">
                <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                    <PhoneOff className="h-8 w-8 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">{isConnected ? 'End Call' : 'Cancel'}</span>
            </footer>

            <audio autoPlay playsInline muted={false} className="hidden" />
        </div>
    );
}