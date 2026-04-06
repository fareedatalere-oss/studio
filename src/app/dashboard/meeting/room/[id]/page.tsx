
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
    Mic, Video as VideoIcon, PhoneOff, Settings, 
    Loader2, Camera, ImageIcon, 
    StopCircle, UserX, X, MessageSquare, Monitor, Eraser, Send,
    Clock, Check, UserMinus, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, Query, ID } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

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
    
    // UI States
    const [participants, setParticipants] = useState<any[]>([]);
    const [joinRequests, setJoinRequests] = useState<any[]>([]);
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [boardDraft, setBoardContent] = useState('');
    
    // Presence & Media States
    const [useCamera, setUseCamera] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMeeting = useCallback(async () => {
        try {
            const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(doc);
            setBoardContent(doc.boardContent || '');
            
            if (doc.status === 'ended') {
                toast({ title: 'Meeting Expired', description: 'This link is no longer valid.' });
                router.replace('/dashboard/meeting');
                return;
            }

            const limit = doc.type === 'personal' ? 3600 : 10800;
            if (doc.startedAt) {
                const elapsed = Math.floor((Date.now() - new Date(doc.startedAt).getTime()) / 1000);
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
    }, [meetingId, router, toast]);

    const endMeeting = async () => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
            router.replace('/dashboard/meeting');
        } catch (e) {}
    };

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            
            const all = res.documents;
            setParticipants(all.filter(a => a.status === 'approved'));
            setJoinRequests(all.filter(a => a.status === 'waiting'));
        } catch (e) {}
    }, [meetingId]);

    useEffect(() => {
        fetchMeeting();
        fetchAttendees();

        const unsubMeeting = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${meetingId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') router.replace('/dashboard/meeting');
            setMeeting(payload);
            setBoardContent(payload.boardContent || '');
        });

        const unsubAttendees = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
            const payload = response.payload as any;
            if (payload.meetingId === meetingId) fetchAttendees();
        });

        return () => { unsubMeeting(); unsubAttendees(); };
    }, [meetingId, fetchMeeting, fetchAttendees, router]);

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

    const startSession = async () => {
        setIsInRoom(true);
        if (user && meeting && meeting.hostId === user.$id && !meeting.startedAt) {
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { 
                    status: 'started',
                    startedAt: new Date().toISOString()
                });
                
                // Add host as approved attendee
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, ID.unique(), {
                    meetingId,
                    userId: user.$id,
                    name: profile?.username || 'Admin',
                    avatar: profile?.avatar || '',
                    status: 'approved',
                    isHost: true
                });
            } catch (e) {}
        }
    };

    const approveUser = async (id: string) => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, id, { status: 'approved' });
            toast({ title: 'User Approved' });
        } catch (e) {}
    };

    const declineUser = async (id: string) => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, id, { status: 'declined' });
        } catch (e) {}
    };

    const updateBoard = async () => {
        if (meeting.hostId !== user?.$id) return;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { boardContent: boardDraft });
            toast({ title: 'Board Updated' });
        } catch (e) {}
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (isInRoom && useCamera && videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
                .catch(() => {});
        }
    }, [isInRoom, useCamera]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

    if (!isInRoom) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Card className="max-w-md w-full rounded-[3rem] overflow-hidden shadow-2xl border-none">
                    <CardHeader className="bg-primary/5 pt-10 pb-6">
                        <div className="mx-auto h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <VideoIcon className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter">{meeting?.name}</CardTitle>
                        <CardDescription className="font-bold text-sm">{meeting?.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-6 pb-10">
                        <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase text-muted-foreground">
                            <div className="flex flex-col items-center gap-1">
                                <Clock className="h-4 w-4 opacity-50" />
                                <span>{meeting?.type === 'personal' ? '1 Hour' : '3 Hours'}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <UserMinus className="h-4 w-4 opacity-50" />
                                <span>{meeting?.type === 'personal' ? 'Up to 5' : 'Unlimited'}</span>
                            </div>
                        </div>
                        <Button onClick={startSession} className="w-full h-16 rounded-full font-black uppercase tracking-widest text-lg shadow-xl">
                            {meeting?.hostId === user?.$id ? 'Start Session' : 'Enter Lobby'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen w-full relative overflow-hidden bg-black flex flex-col font-body">
            {/* Header */}
            <header className="relative z-20 p-4 bg-black/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500 h-2.5 w-2.5 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                    <div className="flex flex-col">
                        <h2 className="text-white font-black uppercase text-[10px] tracking-widest truncate max-w-[120px]">{meeting?.name}</h2>
                        {timeLeft !== null && <p className="text-white/60 font-mono text-[8px] uppercase">{formatTime(timeLeft)} left</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", useCamera ? "bg-primary text-white" : "bg-white/10 text-white")} onClick={() => setUseCamera(!useCamera)}><Camera className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-red-600 text-white" onClick={endMeeting}><PhoneOff className="h-5 w-5" /></Button>
                </div>
            </header>

            {/* Main Stage - Icons Style */}
            <main className="flex-1 relative z-10 p-6 overflow-y-auto">
                <div className="flex flex-wrap justify-center items-center gap-8 max-w-4xl mx-auto h-full content-center">
                    {participants.map((p) => (
                        <div key={p.$id} className="flex flex-col items-center gap-2 group">
                            <div className="relative">
                                <Avatar className={cn(
                                    "h-24 w-24 border-4 p-1 shadow-2xl transition-transform hover:scale-110",
                                    p.isHost ? "border-yellow-500" : "border-primary/40"
                                )}>
                                    <AvatarImage src={p.avatar} />
                                    <AvatarFallback className="font-black text-2xl uppercase bg-primary text-white">{p.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {p.isHost && <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 border-2 border-black"><ShieldCheck className="h-3 w-3 text-black" /></div>}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 h-3 w-3 rounded-full border-2 border-black"></div>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white uppercase tracking-tighter">@{p.name}</p>
                                <p className="text-[8px] font-bold text-primary animate-pulse uppercase">Live</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Host Approval Strip */}
            {meeting?.hostId === user?.$id && joinRequests.length > 0 && (
                <div className="absolute bottom-24 left-4 right-4 z-30 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-10">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary">
                            <AvatarImage src={joinRequests[0].avatar} />
                            <AvatarFallback>{joinRequests[0].name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-[10px] font-black uppercase text-white tracking-widest">Entry Request</p>
                            <p className="text-sm font-bold text-white">@{joinRequests[0].name} is waiting...</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="rounded-full h-10 px-4 font-black text-[10px] uppercase" onClick={() => declineUser(joinRequests[0].$id)}><X className="h-4 w-4 mr-1" /> Deny</Button>
                        <Button size="sm" className="rounded-full h-10 px-6 font-black text-[10px] uppercase bg-green-500 hover:bg-green-600" onClick={() => approveUser(joinRequests[0].$id)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="relative z-20 p-6 bg-gradient-to-t from-black to-transparent flex items-center justify-center gap-6">
                <Dialog open={isBoardOpen} onOpenChange={setIsBoardOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-16 w-16 rounded-full bg-white/10 border-white/20 text-white shadow-xl hover:bg-white/20 transition-all">
                            <Monitor className="h-7 w-7" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl h-[80vh] flex flex-col rounded-[3rem] p-8 border-none shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <DialogHeader className="border-b pb-4">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="font-black uppercase tracking-widest text-sm">Meeting Board</DialogTitle>
                                {meeting?.hostId === user?.$id && (
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" onClick={() => setBoardContent('')}><Eraser className="h-4 w-4 text-destructive" /></Button>
                                        <Button size="icon" variant="ghost" onClick={updateBoard}><Send className="h-4 w-4 text-primary" /></Button>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="flex-1 py-6">
                            {meeting?.hostId === user?.$id ? (
                                <Textarea 
                                    className="h-full resize-none border-none text-lg font-bold placeholder:opacity-30 focus-visible:ring-0" 
                                    placeholder="Write on the community board..."
                                    value={boardDraft}
                                    onChange={(e) => setBoardContent(e.target.value)}
                                />
                            ) : (
                                <div className="h-full w-full bg-muted/30 rounded-3xl p-6 overflow-y-auto">
                                    <p className="whitespace-pre-wrap font-bold text-lg leading-relaxed">{boardDraft || "Admin hasn't written anything yet."}</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <div className="relative group">
                    <video ref={videoRef} className="h-16 w-16 rounded-full bg-muted object-cover border-2 border-primary group-hover:scale-150 group-hover:-translate-y-10 transition-all duration-300" autoPlay muted playsInline />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Camera className="h-4 w-4 text-white" />
                    </div>
                </div>
            </footer >
        </div>
    );
}
