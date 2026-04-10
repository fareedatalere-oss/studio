'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Eraser, Keyboard, Clock, ShieldCheck, Video, 
    Volume2, VolumeX, Mic, MicOff, CameraOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, Query, ID } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

/**
 * @fileOverview Master Meeting Room.
 * ADMIN BYPASS: Creators enter directly without identity capture or approval.
 * DISCONNECT CONTROL: Universal hangups for all members.
 */

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isInRoom, setIsInRoom] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    
    const [participants, setParticipants] = useState<any[]>([]);
    const [joinRequests, setJoinRequests] = useState<any[]>([]);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [boardDraft, setBoardContent] = useState('');
    
    const [useCamera, setUseCamera] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const handleAdminBypass = useCallback(async (docData: any) => {
        if (isInRoom) return;
        
        setIsInRoom(true);
        if (!docData.startedAt) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { 
                status: 'started',
                startedAt: new Date().toISOString()
            });
        }
        
        const check = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
            Query.equal('meetingId', meetingId),
            Query.equal('userId', user?.$id)
        ]);
        
        if (check.total === 0 && user?.$id) {
            const guestData = sessionStorage.getItem(`meeting_guest_${meetingId}`);
            const parsed = guestData ? JSON.parse(guestData) : null;

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, ID.unique(), {
                meetingId,
                userId: user.$id,
                name: parsed?.name || profile?.username || 'Admin',
                avatar: parsed?.avatar || profile?.avatar || '',
                status: 'approved',
                isHost: true,
                hasVideo: true,
                hasAudio: true,
                createdAt: new Date().toISOString()
            });
        }
        setUseCamera(true);
    }, [meetingId, user?.$id, profile, isInRoom]);

    const endMeeting = async () => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
            router.replace('/dashboard/meeting');
        } catch (e) {}
    };

    const fetchMeeting = useCallback(async () => {
        try {
            const docData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(docData);
            setBoardContent(docData.boardContent || '');
            
            if (docData.status === 'ended') {
                toast({ variant: 'destructive', title: 'Meeting Expired' });
                router.replace('/dashboard/meeting');
                return;
            }

            if (user?.$id && user.$id === docData.hostId) {
                await handleAdminBypass(docData);
            }

            const limit = docData.type === 'personal' ? 3600 : 10800;
            if (docData.startedAt) {
                const elapsed = Math.floor((Date.now() - new Date(docData.startedAt).getTime()) / 1000);
                const remaining = limit - elapsed;
                if (remaining <= 0) {
                    await endMeeting();
                } else {
                    setTimeLeft(remaining);
                }
            }
        } catch (e) {
            router.replace('/dashboard/meeting');
        } finally {
            setLoading(false);
        }
    }, [meetingId, router, toast, user, handleAdminBypass]);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            setParticipants(res.documents.filter(a => a.status === 'approved'));
            setJoinRequests(res.documents.filter(a => a.status === 'waiting'));
        } catch (e) {}
    }, [meetingId]);

    useEffect(() => {
        if (!user) return;
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
    }, [meetingId, fetchMeeting, fetchAttendees, router, user]);

    useEffect(() => {
        if (isInRoom && useCamera) {
            const startCamera = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localStreamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (e) {
                    setUseCamera(false);
                }
            };
            startCamera();
        } else {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        }
    }, [isInRoom, useCamera]);

    useEffect(() => {
        if (!isInRoom || timeLeft === null) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    endMeeting();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isInRoom, timeLeft]);

    const handleEntry = async () => {
        if (user?.$id === meeting?.hostId) {
            await handleAdminBypass(meeting);
            return;
        }

        const guestData = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        if (guestData) {
            const parsed = JSON.parse(guestData);
            const attendee = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, parsed.requestId);
            if (attendee.status === 'approved') {
                setIsInRoom(true);
                setUseCamera(true);
            } else {
                router.replace(`/dashboard/meeting/join/${meetingId}`);
            }
        } else {
            router.replace(`/dashboard/meeting/join/${meetingId}`);
        }
    };

    const approveUser = async (req: any) => {
        if (meeting.type === 'personal' && participants.length >= 5) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: 'Personal meetings are limited to 5 people.' });
            return;
        }
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, req.$id, { status: 'approved' });
    };

    const toggleBoard = async (visible: boolean) => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { 
            boardVisible: visible,
            boardContent: boardDraft 
        });
        setIsBoardOpen(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getIconSize = () => {
        const count = participants.length;
        if (count <= 2) return "h-40 w-40 md:h-64 md:w-64";
        if (count <= 4) return "h-28 w-28 md:h-48 md:w-48";
        return "h-20 w-20 md:h-32 md:w-32";
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

    const isAdmin = user?.$id === meeting?.hostId;

    if (!isInRoom) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6">
                <Card className="max-w-md w-full rounded-[3rem] overflow-hidden shadow-2xl border-none text-center">
                    <CardHeader className="bg-primary/5 pt-10">
                        <Video className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter mt-4">{meeting?.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-8 space-y-6">
                        <Button onClick={handleEntry} className="w-full h-16 rounded-full font-black uppercase tracking-widest text-lg shadow-xl">
                            Enter meeting room
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-black flex flex-col overflow-hidden relative font-body text-white">
            {meeting?.boardVisible && (
                <div className="absolute inset-0 z-[100] bg-black p-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                    <div className="max-w-3xl w-full p-10 bg-white/5 border border-white/10 rounded-[3rem] shadow-2xl">
                        <p className="text-primary font-black uppercase tracking-[0.5em] text-[10px] mb-6">Board Display</p>
                        <p className="text-2xl md:text-4xl font-bold leading-relaxed whitespace-pre-wrap">{meeting.boardContent}</p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => toggleBoard(false)} variant="secondary" className="mt-10 rounded-full font-black uppercase tracking-widest h-12 px-8">Close Board</Button>
                    )}
                </div>
            )}

            <header className="p-4 pt-12 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md z-50">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></div>
                    <div>
                        <h2 className="font-black uppercase text-[10px] tracking-widest leading-none">{meeting?.name}</h2>
                        {timeLeft !== null && <p className="text-[8px] font-mono text-white/50 uppercase mt-1">End in: {formatTime(timeLeft)}</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <>
                            <Dialog open={isBoardOpen} onOpenChange={setIsBoardOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 rounded-full bg-white/10 font-black uppercase text-[9px]">board</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none bg-black text-white">
                                    <DialogHeader><DialogTitle className="font-black uppercase tracking-widest text-xs">Community Board</DialogTitle></DialogHeader>
                                    <Textarea className="h-40 bg-white/5 border-white/10 rounded-2xl mt-4 font-bold text-lg" placeholder="Write message..." value={boardDraft} onChange={e => setBoardContent(e.target.value)} />
                                    <div className="grid grid-cols-2 gap-3 mt-6">
                                        <Button variant="ghost" onClick={() => setBoardContent('')} className="rounded-full uppercase font-black text-[10px]"><Eraser className="mr-2 h-4 w-4" /> Clear</Button>
                                        <Button onClick={() => toggleBoard(true)} className="rounded-full uppercase font-black text-[10px]">display</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={endMeeting} className="h-8 rounded-full bg-red-600/20 text-red-500 font-black uppercase text-[9px]">hang up</Button>
                        </>
                    )}
                    {!isAdmin && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 bg-red-600/20 text-red-500 rounded-full" onClick={() => router.push('/dashboard/meeting')} title="Disconnect"><PhoneOff className="h-5 w-5" /></Button>
                    )}
                </div>
            </header>

            <main className="flex-1 p-6 flex flex-wrap items-center justify-center gap-6 overflow-y-auto content-center">
                {participants.filter(p => p.userId !== user?.$id).map((p) => (
                    <div key={p.$id} className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95">
                        <div className={cn(
                            "relative rounded-full border-4 p-1 shadow-2xl transition-all duration-500",
                            p.isHost ? "border-yellow-500" : "border-primary/40",
                            getIconSize()
                        )}>
                            <Avatar className="h-full w-full">
                                <AvatarImage src={p.avatar} className="object-cover" />
                                <AvatarFallback className="font-black text-xl bg-primary">{p.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-primary p-1.5 rounded-full border-2 border-black shadow-sm">
                                <Volume2 className="h-3 w-3 text-white" />
                            </div>
                        </div>
                        <p className="font-black uppercase text-[10px] tracking-widest text-white/80">@{p.name}</p>
                    </div>
                ))}
            </main>

            {isAdmin && joinRequests.length > 0 && (
                <footer className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-lg flex items-center gap-4 overflow-x-auto">
                    <p className="text-[10px] font-black uppercase text-primary shrink-0 mr-2">Waiting:</p>
                    {joinRequests.map(req => (
                        <Button key={req.$id} onClick={() => approveUser(req)} variant="ghost" className="h-12 px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 shrink-0 hover:bg-white/10">
                            <Avatar className="h-8 w-8"><AvatarImage src={req.avatar} /></Avatar>
                            <span className="text-[10px] font-black uppercase">Approve {req.name}</span>
                        </Button>
                    ))}
                </footer>
            )}

            <div className="absolute bottom-10 left-10 z-50 flex items-end gap-4">
                <div className={cn(
                    "h-24 w-24 md:h-32 md:w-32 rounded-3xl bg-muted border-4 border-primary overflow-hidden shadow-2xl transition-all duration-300",
                    !useCamera && "flex items-center justify-center bg-black/50"
                )}>
                    {useCamera ? (
                        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                    ) : (
                        <CameraOff className="h-8 w-8 text-white/20" />
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-black/50 border-2 border-white/20 backdrop-blur-md" onClick={() => setUseCamera(!useCamera)}>
                        {useCamera ? <Video className="h-5 w-5" /> : <Camera className="h-5 w-5 text-red-500" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-black/50 border-2 border-white/20 backdrop-blur-md" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}