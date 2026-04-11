
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_PROFILES, client } from '@/lib/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * @fileOverview Pure White Call Request Screen (Sender View).
 * Simplified to match sketch: Center Avatar + Name, status, and hang up.
 */

export default function PrivateCallPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const callId = params.id as string;

    const [call, setCall] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [status, setStatus] = useState<'calling' | 'ringing'>('calling');

    const fetchCall = useCallback(async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId);
            setCall(data);
            
            const partnerId = data.invitedUsers?.[0] === user?.$id ? data.hostId : data.invitedUsers?.[0];
            if (partnerId) {
                const p = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, partnerId);
                setPartner(p);
            }
            
            // Artificial delay to switch from Calling to Ringing for professional feel
            setTimeout(() => setStatus('ringing'), 2000);

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
        });
        return () => unsub();
    }, [callId, fetchCall, router]);

    const handleHangUp = async () => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, callId, { status: 'ended' });
        router.replace('/dashboard/chat');
    };

    if (!partner) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-between py-24 font-body overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full px-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-full -m-6 animate-ping"></div>
                    <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
                        <AvatarImage src={partner.avatar} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white text-5xl font-black">{partner.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-black text-2xl font-black tracking-tighter">@{partner.username}</h2>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                        {status === 'calling' ? 'Calling...' : 'Ringing...'}
                    </p>
                </div>
            </div>

            <footer className="w-full max-w-sm px-10 pb-10 flex flex-col items-center">
                <Button onClick={handleHangUp} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600">
                    <PhoneOff className="h-8 w-8 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-widest mt-4">End Call</span>
            </footer>
        </div>
    );
}
