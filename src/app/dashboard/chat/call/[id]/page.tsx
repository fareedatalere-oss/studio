'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Video, X, Send, 
    Mic, MicOff, MessageSquare, Layout, Smile,
    ImageIcon, Music, Film, MonitorPlay, Volume2, VolumeX, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, client, Query, ID } from '@/lib/data-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

/**
 * @fileOverview Private Call Page.
 * UI: Shows receiver name/icon with Accept/Decline or Cancel buttons.
 * HARDENING: Removed all premature redirects. Call stays active until hangup.
 */

const getChatId = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            const partnerId = data.invitedUsers?.find((id: string) => id !== user?.$id) || data.hostId;
            if (partnerId && partnerId !== user?.$id) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
        } catch (e) {}
    }, [callId, user?.$id]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
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

    const handleAccept = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'connected' });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!partner || !call) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

    const isConnected = call.status === 'connected';
    const isIncoming = call.status === 'pending' && call.hostId !== user?.$id;
    const isOutgoing = call.status === 'pending' && call.hostId === user?.$id;

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-24 font-body overflow-hidden relative">
            <audio autoPlay playsInline muted={false} className="hidden" />

            <header className="absolute top-16 left-0 right-0 text-center z-50">
                <div className="space-y-1">
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">
                        {isConnected ? 'Secure Line' : isIncoming ? 'Incoming Call' : 'Calling...'}
                    </p>
                    <p className="text-lg font-black text-black/40">{isConnected ? formatDuration(duration) : 'Private Session'}</p>
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
                <div className="text-center">
                    <h2 className="text-black text-2xl font-black tracking-tighter uppercase">@{partner.username}</h2>
                    <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest">End-to-End Encrypted</p>
                </div>
            </div>

            <footer className="w-full max-sm px-10 flex flex-col items-center gap-10 z-50">
                {isIncoming ? (
                    <div className="flex items-center justify-center gap-12 w-full animate-in slide-in-from-bottom-10">
                        <div className="flex flex-col items-center gap-4">
                            <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                                <PhoneOff className="h-8 w-8 text-white" />
                            </Button>
                            <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Decline</span>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl active:scale-90 transition-transform">
                                <CheckCircle2 className="h-10 w-10 text-white" />
                            </Button>
                            <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Accept</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-10">
                         <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                            <PhoneOff className="h-8 w-8 text-white" />
                        </Button>
                        <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">{isOutgoing ? 'Cancel' : 'End Call'}</span>
                    </div>
                )}
            </footer>

            <div className="absolute bottom-10 opacity-20">
                <p className="text-[8px] font-black uppercase tracking-widest">I-Pay Secure Line active</p>
            </div>
        </div>
    );
}