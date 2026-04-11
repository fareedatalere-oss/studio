
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Video, Volume2, Mic, MicOff, X,
    MonitorPlay, Send, MessageSquare, Heart, Play, Pause, UploadCloud,
    Layout
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
    const [waitingList, setWaitingList] = useState<any[]>([]);
    
    // UI Mode States
    const [mode, setMode] = useState<'idle' | 'board' | 'display'>('idle');
    const [isUploading, setIsUploading] = useState(false);
    
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const isAdmin = useMemo(() => user?.$id === meeting?.hostId, [user?.$id, meeting?.hostId]);

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
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            setParticipants(res.documents.filter(a => a.status === 'approved'));
            setWaitingList(res.documents.filter(a => a.status === 'waiting'));
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

    const handleHangUp = async () => {
        if (isAdmin) {
            // ADMIN ENDS MEETING FOR EVERYONE
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
        } else {
            // GUEST JUST LEAVES
            router.replace('/dashboard/meeting');
        }
    };

    const approveGuest = async (attendeeId: string) => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, attendeeId, { status: 'approved' });
    };

    const declineGuest = async (attendeeId: string) => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, attendeeId, { status: 'declined' });
    };

    const kickGuest = async (attendeeId: string) => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, attendeeId, { status: 'declined' });
    };

    const updateBoard = async (val: string) => {
        if (!isAdmin) return;
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { boardContent: val });
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isAdmin) return;
        setIsUploading(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(upload.$id);
            const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'music' : 'image';
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, {
                displayVisible: true, displayUrl: url, displayType: type
            });
        } catch (e) {} finally { setIsUploading(false); }
    };

    if (loading || !meeting) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    const myAttendee = participants.find(p => p.userId === user?.$id);

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden relative font-body">
            
            {/* BROWN BOARD OVERLAY */}
            {(mode === 'board' || (meeting.boardContent && !isAdmin)) && (
                <div className="absolute inset-0 z-[100] bg-[#4e342e] flex flex-col p-6 animate-in fade-in duration-300">
                    <header className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                        <h2 className="font-black uppercase text-xs tracking-widest">Meeting Board</h2>
                        <Button variant="ghost" size="icon" onClick={() => setMode('idle')} className="rounded-full bg-white/10"><X className="h-5 w-5" /></Button>
                    </header>
                    <Textarea 
                        value={meeting.boardContent || ''} 
                        onChange={e => updateBoard(e.target.value)}
                        placeholder="Start writing..." 
                        readOnly={!isAdmin}
                        className="flex-1 bg-transparent border-none text-xl font-bold resize-none focus-visible:ring-0 placeholder:text-white/20"
                    />
                </div>
            )}

            {/* BROWN DISPLAY OVERLAY */}
            {(mode === 'display' || (meeting.displayVisible && !isAdmin)) && (
                <div className="absolute inset-0 z-[110] bg-[#4e342e] flex flex-col p-6 animate-in fade-in duration-300">
                    <header className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                        <h2 className="font-black uppercase text-xs tracking-widest">Shared Display</h2>
                        <Button variant="ghost" size="icon" onClick={async () => {
                            if (isAdmin) await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { displayVisible: false });
                            setMode('idle');
                        }} className="rounded-full bg-white/10"><X className="h-5 w-5" /></Button>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-[2rem] overflow-hidden border border-white/5 relative">
                        {meeting.displayVisible ? (
                            <>
                                {meeting.displayType === 'image' && <Image src={meeting.displayUrl} alt="Shared" fill className="object-contain" unoptimized />}
                                {meeting.displayType === 'video' && <video src={meeting.displayUrl} controls autoPlay className="w-full h-full" />}
                                {meeting.displayType === 'music' && (
                                    <div className="flex flex-col items-center gap-6">
                                        <Volume2 className="h-20 w-20 text-primary animate-pulse" />
                                        <audio src={meeting.displayUrl} controls autoPlay className="w-full max-w-md" />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center space-y-4">
                                <MonitorPlay className="h-16 w-16 mx-auto opacity-20" />
                                <p className="font-black uppercase text-[10px] tracking-widest opacity-40">No media shared</p>
                                {isAdmin && (
                                    <Button onClick={() => mediaInputRef.current?.click()} variant="outline" className="rounded-full font-black uppercase text-[9px] h-10 border-white/20">
                                        <UploadCloud className="mr-2 h-4 w-4" /> Upload Media
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleMediaUpload} />
                </div>
            )}

            <header className="p-4 pt-12 flex justify-between items-center bg-black/50 border-b border-white/5 z-50">
                <div className="flex-1">
                    <h1 className="font-black uppercase text-xs tracking-widest text-primary truncate">{meeting.name}</h1>
                    <p className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">I-Pay meeting Hub</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <Button onClick={() => setMode('board')} size="sm" variant="outline" className="h-8 rounded-full font-black uppercase text-[9px] border-white/10">board</Button>
                        <Button onClick={() => setMode('display')} size="sm" variant="outline" className="h-8 rounded-full font-black uppercase text-[9px] border-white/10">display</Button>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 max-w-6xl mx-auto py-10">
                    {participants.map(p => (
                        <div key={p.$id} className="flex flex-col items-center gap-2 group relative">
                            <div className={cn("relative rounded-full border-2 p-0.5 h-14 w-14 transition-all", p.isHost ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "border-primary/40 shadow-xl")}>
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
                                {isAdmin && !p.isHost && (
                                    <Button onClick={() => kickGuest(p.$id)} variant="destructive" size="icon" className="absolute -top-1 -right-1 h-5 w-5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3"/></Button>
                                )}
                            </div>
                            <p className="font-bold text-[8px] opacity-80 uppercase text-center truncate w-full lowercase">{p.name}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* JOIN REQUESTS OVERLAY (ADMIN ONLY) */}
            {isAdmin && waitingList.length > 0 && (
                <div className="absolute bottom-24 left-0 right-0 p-4 flex flex-col items-center gap-2 z-[80]">
                    <div className="flex gap-4 overflow-x-auto max-w-full no-scrollbar pb-2">
                        {waitingList.map(req => (
                            <div key={req.$id} className="bg-white rounded-3xl p-3 flex items-center gap-4 shadow-2xl border-2 border-primary animate-in slide-in-from-bottom-5">
                                <Avatar className="h-10 w-10 ring-2 ring-primary/10"><AvatarImage src={req.avatar} /><AvatarFallback>{req.name?.charAt(0)}</AvatarFallback></Avatar>
                                <div className="min-w-[100px]">
                                    <p className="text-[10px] font-black text-black lowercase">{req.name}</p>
                                    <div className="flex gap-2 mt-1">
                                        <Button size="sm" className="h-6 px-3 text-[8px] font-black uppercase rounded-full bg-primary" onClick={() => approveGuest(req.$id)}>Accept</Button>
                                        <Button size="sm" variant="ghost" className="h-6 px-3 text-[8px] font-black uppercase rounded-full text-destructive" onClick={() => declineGuest(req.$id)}>Deny</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <footer className="p-6 border-t bg-black/80 backdrop-blur-md border-white/5 flex flex-col items-center gap-4 z-[90]">
                {/* SELF ICON BOTTOM PIN */}
                <div className="flex items-center gap-3 bg-white/5 p-2 pr-6 rounded-full border border-white/10 shadow-xl">
                    <div className="h-10 w-10 rounded-full border-2 border-primary p-0.5">
                        <Avatar className="h-full w-full">
                            <AvatarImage src={profile?.avatar} />
                            <AvatarFallback>{profile?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">You (Live)</p>
                        <p className="text-[8px] font-bold opacity-50 lowercase mt-1">{profile?.username}</p>
                    </div>
                </div>

                <Button variant="destructive" className="rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-95" onClick={handleHangUp}>
                    <PhoneOff className="mr-2 h-4 w-4" /> {isAdmin ? 'hang up' : 'disconnect meeting'}
                </Button>
            </footer>
        </div>
    );
}
