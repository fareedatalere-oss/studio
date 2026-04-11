'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Video, Volume2, Mic, MicOff, X,
    MonitorPlay, Send, MessageSquare, Heart, Play, Pause, UploadCloud,
    Layout, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_MESSAGES, COLLECTION_ID_PROFILES, client, Query, ID, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    
    const mySetup = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        return saved ? JSON.parse(saved) : null;
    }, [meetingId]);

    const fetchMeeting = useCallback(async () => {
        try {
            const docData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(docData);
            if (docData.status === 'ended') router.replace('/dashboard/meeting');
        } catch (e) {
            router.replace('/dashboard/meeting');
        } finally {
            setLoading(false);
        }
    }, [meetingId, router]);

    const fetchAttendees = useCallback(async () => {
        try {
            // Simplified query to avoid composite index error
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            // Filter status client-side
            const approvedAttendees = res.documents.filter(doc => doc.status === 'approved');
            setParticipants(approvedAttendees);
        } catch (e) {}
    }, [meetingId]);

    useEffect(() => {
        fetchMeeting();
        fetchAttendees();
        
        const unsubMeeting = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${meetingId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') router.replace('/dashboard/meeting');
            setMeeting(payload);
        });

        const unsubAttendees = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
            const payload = response.payload as any;
            if (payload.meetingId === meetingId) fetchAttendees();
        });

        return () => { unsubMeeting(); unsubAttendees(); };
    }, [meetingId, fetchMeeting, fetchAttendees, router]);

    const handleDisconnect = async () => {
        // Just leave, but don't end for everyone unless host
        router.replace('/dashboard/meeting');
    };

    if (loading || !meeting) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden relative font-body">
            
            <header className="p-4 pt-12 flex justify-between items-center bg-black/50 border-b border-white/5 z-50">
                <div className="flex-1">
                    <h1 className="font-black uppercase text-xs tracking-widest text-primary truncate">{meeting.name}</h1>
                    <p className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">
                        {meeting.type} Meeting Hub
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleDisconnect} size="sm" variant="destructive" className="h-8 rounded-full font-black uppercase text-[9px] shadow-lg">
                        Disconnect
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 max-w-6xl mx-auto py-10">
                    {participants.map(p => (
                        <div key={p.$id} className="flex flex-col items-center gap-2 group relative">
                            <div className={cn("relative rounded-full border-2 p-0.5 h-16 w-16 transition-all", p.isHost ? "border-yellow-500" : "border-primary/40")}>
                                {p.hasVideo ? (
                                    <div className="h-full w-full rounded-full overflow-hidden bg-muted">
                                        <video autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                                    </div>
                                ) : (
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={p.avatar} className="object-cover" />
                                        <AvatarFallback className="font-black bg-muted text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            <p className="font-bold text-[8px] opacity-80 uppercase text-center truncate w-full">{p.name}</p>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="p-6 border-t bg-black/80 backdrop-blur-md border-white/5 flex flex-col items-center gap-4 z-[90]">
                <div className="flex items-center gap-3 bg-white/5 p-2 pr-6 rounded-full border border-white/10 shadow-xl">
                    <div className="h-10 w-10 rounded-full border-2 border-primary p-0.5">
                        <Avatar className="h-full w-full">
                            <AvatarImage src={mySetup?.avatar || profile?.avatar} />
                            <AvatarFallback>{mySetup?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">You (Live)</p>
                        <p className="text-[8px] font-bold opacity-50 mt-1">{mySetup?.name || profile?.username}</p>
                    </div>
                </div>
                
                <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-20">I-Pay Meeting Environment</p>
            </footer>
        </div>
    );
}
