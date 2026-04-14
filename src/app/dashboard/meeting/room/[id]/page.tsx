'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Video, Mic, MicOff, X,
    MonitorPlay, Send, MessageSquare, Trash2, Check, XCircle, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, Query, ID } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

/**
 * @fileOverview Master Meeting Room Page.
 * HARDENED Sync: Strictly filtered by Meeting ID to prevent global state leaks.
 * FIXED: One icon per user (Unique UID Map).
 * SHIELDED: Zero auto-redirection unless manual Chairman action.
 */

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;
    
    const selfVideoRef = useRef<HTMLVideoElement>(null);

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    
    const mySetup = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        return saved ? JSON.parse(saved) : null;
    }, [meetingId]);

    const isAdmin = mySetup?.isHost === true || user?.$id === meeting?.hostId;

    const fetchMeeting = useCallback(async () => {
        try {
            const docData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(docData);
            
            // ONLY redirect if the database definitively says THIS meeting is ended
            if (docData.status === 'ended' || docData.status === 'cancelled') {
                router.replace('/dashboard/meeting');
            }
        } catch (e) {
            console.error("Meeting sync pending...");
        } finally { setLoading(false); }
    }, [meetingId, router]);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            
            // FORCE: Unique Icons Only using UserID Map
            const uniqueMap = new Map();
            res.documents.filter(doc => doc.status === 'approved').forEach(p => {
                uniqueMap.set(p.userId, p);
            });

            setParticipants(Array.from(uniqueMap.values()));
            setRequests(res.documents.filter(doc => doc.status === 'waiting'));
        } catch (e) {}
    }, [meetingId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        fetchMeeting();
        fetchAttendees();
        
        // HARDENED LISTENER: Strictly check payload ID to prevent global closures
        const unsubMeeting = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents`], response => {
            const payload = response.payload as any;
            if (!payload || payload.$id !== meetingId) return;

            if (payload.status === 'ended' || payload.status === 'cancelled') {
                toast({ title: 'Session Ended', description: 'The host has closed this meeting.' });
                router.replace('/dashboard/meeting');
                return;
            }
            setMeeting(payload);
        });

        const unsubAttendees = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
            const payload = response.payload as any;
            if (payload && payload.meetingId === meetingId) fetchAttendees();
        });

        if (mySetup?.useCamera && navigator?.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
            }).catch(() => {});
        }

        return () => { unsubMeeting(); unsubAttendees(); };
    }, [meetingId, fetchMeeting, fetchAttendees, router, mySetup?.useCamera, toast]);

    const handleAction = async (requestId: string, status: 'approved' | 'declined') => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, { status });
        fetchAttendees();
    };

    const handleEndMeeting = async () => {
        if (isAdmin) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
        }
        router.replace('/dashboard/meeting');
    };

    if (loading || !meeting) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden relative font-body">
            <header className="p-4 pt-12 flex justify-between items-center bg-black/50 border-b border-white/5 z-50">
                <div className="flex-1">
                    <h1 className="font-black uppercase text-xs tracking-widest text-primary truncate">{meeting.name}</h1>
                    <p className="text-[8px] font-bold opacity-50 uppercase">{isAdmin ? 'Chairman Control' : 'Secure Session'}</p>
                </div>
                <Button onClick={handleEndMeeting} size="sm" variant="destructive" className="h-9 rounded-full font-black uppercase text-[9px] shadow-lg px-6">
                    {isAdmin ? 'End Session' : 'Leave'}
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 scrollbar-visible">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 max-w-6xl mx-auto py-10">
                    {participants.map(p => (
                        <div key={p.$id} className="flex flex-col items-center gap-2 group relative">
                            <div className={cn("relative rounded-full border-2 p-0.5 h-20 w-20 transition-all", p.isHost ? "border-yellow-500" : "border-primary/40")}>
                                <audio autoPlay playsInline muted={p.userId === user?.$id} className="hidden" />
                                <Avatar className="h-full w-full shadow-xl">
                                    <AvatarImage src={p.avatar} className="object-cover" />
                                    <AvatarFallback className="font-black bg-muted text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {isAdmin && !p.isHost && (
                                    <button onClick={() => handleAction(p.$id, 'declined')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><X className="h-3 w-3" /></button>
                                )}
                            </div>
                            <p className="font-black text-[8px] opacity-80 uppercase text-center truncate w-full tracking-tighter">@{p.name}</p>
                        </div>
                    ))}
                </div>
            </main>

            {isAdmin && requests.length > 0 && (
                <div className="absolute bottom-28 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5">
                    <div className="max-w-2xl mx-auto">
                        <ScrollArea className="w-full">
                            <div className="flex gap-3 pb-2">
                                {requests.map(req => (
                                    <div key={req.$id} className="bg-white/10 backdrop-blur-2xl border border-white/20 p-3 rounded-3xl flex items-center gap-4 shrink-0 shadow-2xl">
                                        <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-primary"><img src={req.avatar} className="h-full w-full object-cover" alt="Req" /></div>
                                        <div className="min-w-[80px]">
                                            <span className="text-[10px] font-black uppercase truncate block leading-tight">{req.name}</span>
                                            <p className="text-[7px] font-bold text-primary uppercase mt-0.5">Wants Entry</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" onClick={() => handleAction(req.$id, 'approved')} className="h-10 w-10 rounded-full bg-green-500 shadow-lg"><Check className="h-5 w-5" /></Button>
                                            <Button size="icon" onClick={() => handleAction(req.$id, 'declined')} className="h-10 w-10 rounded-full bg-red-500 shadow-lg"><X className="h-5 w-5" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}

            <footer className="p-6 border-t bg-black/80 backdrop-blur-md border-white/5 flex items-center justify-between z-[90] safe-area-bottom">
                <div className="flex items-center gap-3 bg-white/5 p-2 pr-6 rounded-full border border-white/10">
                    <div className="h-12 w-12 rounded-full border-2 border-primary p-0.5 overflow-hidden">
                        {mySetup?.useCamera ? <video ref={selfVideoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" /> : <Avatar className="h-full w-full"><AvatarImage src={mySetup?.avatar || profile?.avatar} className="object-cover" /><AvatarFallback>?</AvatarFallback></Avatar>}
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Identity Feed</p>
                        <p className="text-[8px] font-bold opacity-50 uppercase">Live Master Sync</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end opacity-20">
                    <p className="text-[7px] font-black uppercase tracking-[0.4em]">I-Pay Security</p>
                    <p className="text-[6px] font-bold uppercase">No-Crash Protocol Active</p>
                </div>
            </footer>
        </div>
    );
}
