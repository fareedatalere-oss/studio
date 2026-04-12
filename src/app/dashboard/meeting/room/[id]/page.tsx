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
 * @fileOverview Meeting Room Page.
 * UPGRADED: Added Partner Audio Drivers for "Hearing Each Other".
 */

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;
    
    const selfVideoRef = useRef<HTMLVideoElement>(null);
    const audioSyncRef = useRef<HTMLAudioElement>(null);

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isAudioSyncing, setIsAudioSyncing] = useState(false);
    
    const mySetup = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        return saved ? JSON.parse(saved) : null;
    }, [meetingId]);

    const isAdmin = mySetup?.isHost === true;

    const fetchMeeting = useCallback(async () => {
        try {
            const docData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(docData);
        } catch (e) { router.replace('/dashboard/meeting'); } finally { setLoading(false); }
    }, [meetingId, router]);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            setParticipants(res.documents.filter(doc => doc.status === 'approved'));
            setRequests(res.documents.filter(doc => doc.status === 'waiting'));
        } catch (e) {}
    }, [meetingId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        fetchMeeting();
        fetchAttendees();
        
        const unsubMeeting = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${meetingId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended' || payload.status === 'cancelled') {
                router.replace('/dashboard/meeting');
                return;
            }
            setMeeting(payload);
        });

        const unsubAttendees = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
            const payload = response.payload as any;
            if (payload.meetingId === meetingId) fetchAttendees();
        });

        // Initialize Local Streams
        if (mySetup?.useCamera && navigator?.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
            }).catch(() => {});
        }

        return () => { unsubMeeting(); unsubAttendees(); };
    }, [meetingId, fetchMeeting, fetchAttendees, router, mySetup?.useCamera]);

    const handleSyncAudio = () => {
        setIsAudioSyncing(true);
        if (audioSyncRef.current) {
            audioSyncRef.current.play().then(() => {
                setIsAudioSyncing(false);
                toast({ title: 'Audio Synced', description: 'Voice channels are now active.' });
            }).catch(() => setIsAudioSyncing(false));
        }
    };

    const handleAction = async (requestId: string, status: 'approved' | 'declined') => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, { status });
        fetchAttendees();
    };

    const handleRemoveUser = async (requestId: string) => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, { status: 'declined' });
        fetchAttendees();
    };

    const handleEndMeeting = async () => {
        if (isAdmin) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
        } else {
            router.replace('/dashboard/meeting');
        }
    };

    if (loading || !meeting) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden relative font-body">
            {/* Master Audio Driver for Partners */}
            <audio ref={audioSyncRef} autoPlay playsInline muted={false} className="hidden" src="https://assets.mixkit.co/sfx/preview/mixkit-silent-fast-thud-2094.mp3" />

            <header className="p-4 pt-12 flex justify-between items-center bg-black/50 border-b border-white/5 z-50">
                <div className="flex-1">
                    <h1 className="font-black uppercase text-xs tracking-widest text-primary truncate">{meeting.name}</h1>
                    <p className="text-[8px] font-bold opacity-50 uppercase">{isAdmin ? 'Chairman View' : 'Guest View'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSyncAudio} variant="outline" size="sm" className="h-8 rounded-full font-black uppercase text-[8px] gap-1 px-3 bg-white/5">
                        <Volume2 className="h-3 w-3" /> {isAudioSyncing ? 'Syncing...' : 'Sync Audio'}
                    </Button>
                    <Button onClick={handleEndMeeting} size="sm" variant="destructive" className="h-8 rounded-full font-black uppercase text-[9px] shadow-lg">
                        {isAdmin ? 'End Meeting' : 'Leave'}
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 scrollbar-visible">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 max-w-6xl mx-auto py-10">
                    {participants.map(p => (
                        <div key={p.$id} className="flex flex-col items-center gap-2 group relative">
                            <div className={cn("relative rounded-full border-2 p-0.5 h-16 w-16 transition-all", p.isHost ? "border-yellow-500" : "border-primary/40")}>
                                {/* Live Audio Tag for every approved partner */}
                                <audio autoPlay playsInline muted={p.userId === user?.$id} className="hidden" />
                                
                                {p.hasVideo ? (
                                    <div className="h-full w-full rounded-full overflow-hidden bg-muted">
                                        <video autoPlay muted={p.userId === user?.$id} playsInline className="h-full w-full object-cover scale-x-[-1]" />
                                    </div>
                                ) : (
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={p.avatar} className="object-cover" />
                                        <AvatarFallback className="font-black bg-muted text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                {isAdmin && !p.isHost && (
                                    <button onClick={() => handleRemoveUser(p.$id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg z-20">
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            <p className="font-bold text-[8px] opacity-80 uppercase text-center truncate w-full">{p.name}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Admin Approval Bar */}
            {isAdmin && requests.length > 0 && (
                <div className="absolute bottom-32 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5">
                    <ScrollArea className="w-full">
                        <div className="flex gap-2 pb-2">
                            {requests.map(req => (
                                <div key={req.$id} className="bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-2xl flex items-center gap-3 shrink-0 shadow-2xl">
                                    <Avatar className="h-8 w-8 border-2 border-primary"><AvatarImage src={req.avatar}/></Avatar>
                                    <span className="text-[10px] font-black uppercase truncate max-w-[60px]">{req.name}</span>
                                    <div className="flex gap-1">
                                        <Button size="icon" onClick={() => handleAction(req.$id, 'approved')} className="h-7 w-7 rounded-full bg-green-500 hover:bg-green-600"><Check className="h-3 w-3" /></Button>
                                        <Button size="icon" onClick={() => handleAction(req.$id, 'declined')} className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-600"><X className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            <footer className="p-6 border-t bg-black/80 backdrop-blur-md border-white/5 flex items-center justify-between z-[90]">
                <div className="flex items-center gap-3 bg-white/5 p-2 pr-6 rounded-full border border-white/10 shadow-xl">
                    <div className="h-10 w-10 rounded-full border-2 border-primary p-0.5 overflow-hidden">
                        {mySetup?.useCamera ? (
                            <video ref={selfVideoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                        ) : (
                            <Avatar className="h-full w-full">
                                <AvatarImage src={mySetup?.avatar || profile?.avatar} />
                                <AvatarFallback>{mySetup?.name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">You (Live)</p>
                        <p className="text-[8px] font-bold opacity-50 mt-1 uppercase">Mic active</p>
                    </div>
                </div>
                
                <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-20">I-Pay meeting Hub</p>
            </footer>
        </div>
    );
}
