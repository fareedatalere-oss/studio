'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Eraser, Keyboard, Clock, ShieldCheck, Video, 
    Volume2, VolumeX, Mic, MicOff, CameraOff, X,
    MonitorPlay, FileText, UploadCloud, Play, Pause,
    UserX, Send, Smile, MessageSquare, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_MESSAGES, client, Query, ID, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

const LOVE_EMOJIS = ["😍", "♥️", "😋", "🤩", "😘", "🧡", "💔", "❣️", "❤️‍🩹", "❤️", "💓", "💗", "🩷", "💖", "💞", "💘", "💕", "💚", "💟", "💌", "🖤", "🩶", "🤍", "💋", "🫦", "👄", "🫂", "👥", "🧑‍🧑‍🧒‍🧒", "👨‍👧‍👧", "👩‍👧", "👩‍👩‍👧‍👦", "👨‍👦", "👨‍👩‍👧‍👧", "👨‍👨‍👧‍👧", "👩‍👩‍👦‍👦", "👨‍👨‍👦‍👦", "👩‍👩‍👦", "👩‍👩‍👧‍👦", "💏", "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨", "👩‍❤️‍💋‍👩", "👩‍❤️‍👩", "👨‍❤️‍👨", "👩‍❤️‍👨", "💑"];

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
    
    const [useCamera, setUseCamera] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Mode-specific states for "Call" UI
    const [activeMode, setActiveMode] = useState<'voice' | 'video' | 'chat' | 'display'>('voice');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    const isAdmin = useMemo(() => user?.$id === meeting?.hostId, [user?.$id, meeting?.hostId]);
    const isCall = useMemo(() => meeting?.type === 'call', [meeting?.type]);

    const handleEntry = useCallback(async (docData: any) => {
        if (isInRoom) return;

        const guestDataStr = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        const guestData = guestDataStr ? JSON.parse(guestDataStr) : null;

        if (!guestData) {
            router.replace(`/dashboard/meeting/join/${meetingId}${isAdmin ? '?role=admin' : ''}`);
            return;
        }

        setIsInRoom(true);
        setUseCamera(guestData.useCamera || false);

        if (isAdmin && !docData.startedAt) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { 
                status: 'started',
                startedAt: new Date().toISOString()
            });
        }
    }, [meetingId, isAdmin, isInRoom, router]);

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
            
            if (docData.status === 'ended') {
                toast({ variant: 'destructive', title: 'Meeting Expired' });
                router.replace('/dashboard/meeting');
                return;
            }

            await handleEntry(docData);

            if (docData.type === 'call') {
                setActiveMode('voice');
            }

            const limit = docData.type === 'personal' ? 3600 : (docData.type === 'call' ? 7200 : 10800);
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
    }, [meetingId, router, toast, handleEntry]);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            
            const approved = res.documents.filter(a => a.status === 'approved');
            setParticipants(approved);
            setJoinRequests(res.documents.filter(a => a.status === 'waiting'));

            const guestDataStr = sessionStorage.getItem(`meeting_guest_${meetingId}`);
            if (guestDataStr) {
                const guestData = JSON.parse(guestDataStr);
                const me = res.documents.find(a => a.$id === guestData.requestId);
                if (me && me.status === 'declined') {
                    toast({ variant: 'destructive', title: 'Removed', description: 'you have been removed by the host' });
                    router.replace('/dashboard/meeting');
                }
            }
        } catch (e) {}
    }, [meetingId, router, toast]);

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

        if (meeting?.type === 'call') {
            const unsubChat = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
                const payload = response.payload as any;
                if (payload.chatId === `call_chat_${meetingId}`) {
                    setChatMessages(prev => [...prev, payload]);
                }
            });
            return () => { unsubMeeting(); unsubAttendees(); unsubChat(); };
        }

        return () => { unsubMeeting(); unsubAttendees(); };
    }, [meetingId, fetchMeeting, fetchAttendees, user, meeting?.type]);

    useEffect(() => {
        if (isInRoom && (useCamera || activeMode === 'video')) {
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
    }, [isInRoom, useCamera, activeMode]);

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

    const approveUser = async (req: any) => {
        if (meeting.type === 'personal' && participants.length >= 5) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: 'the meeting with this id is personal and already 5 have joined' });
            return;
        }
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, req.$id, { status: 'approved' });
    };

    const kickUser = async (attendeeId: string) => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, attendeeId, { status: 'declined' });
        toast({ title: 'User removed' });
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isAdmin) return;

        setIsUploadingMedia(true);
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(upload.$id);
            const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
            
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, {
                displayVisible: true,
                displayUrl: url,
                displayType: type
            });
            toast({ title: 'Media Live' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploadingMedia(false);
        }
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim()) return;
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
                chatId: `call_chat_${meetingId}`,
                senderId: user.$id,
                text: chatInput.trim(),
                status: 'sent'
            });
            setChatInput('');
        } catch (e) {}
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

    const otherParticipant = participants.find(p => p.userId !== user.$id);
    const myAttendee = participants.find(p => p.userId === user.$id);

    return (
        <div className={cn(
            "h-screen w-full flex flex-col overflow-hidden relative font-body transition-colors duration-500",
            isCall ? "bg-white text-black" : "bg-black text-white"
        )}>
            {/* CALL CHAT OVERLAY */}
            {isCall && activeMode === 'chat' && (
                <div className="absolute inset-0 z-[150] bg-white flex flex-col p-6 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between border-b pb-4 mb-4">
                        <h2 className="font-black uppercase text-xs">Call Chat</h2>
                        <Button variant="ghost" size="icon" onClick={() => setActiveMode('voice')} className="rounded-full bg-muted"><X /></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={cn("flex flex-col max-w-[80%]", msg.senderId === user.$id ? "ml-auto items-end" : "items-start")}>
                                <div className={cn("p-3 rounded-2xl text-xs font-bold", msg.senderId === user.$id ? "bg-primary text-white" : "bg-muted text-black")}>{msg.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {LOVE_EMOJIS.map(e => <button key={e} onClick={() => setChatInput(prev => prev + e)} className="text-xl hover:scale-125 transition-transform">{e}</button>)}
                        </div>
                        <div className="flex gap-2">
                            <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type love message..." className="rounded-full bg-muted border-none h-12 text-black" />
                            <Button size="icon" onClick={sendChatMessage} className="rounded-full h-12 w-12 bg-primary"><Send className="text-white"/></Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CALL VIDEO OVERLAY */}
            {isCall && activeMode === 'video' && (
                <div className="absolute inset-0 z-[140] bg-black flex flex-col items-center justify-center animate-in zoom-in-95">
                    <Button variant="ghost" size="icon" onClick={() => setActiveMode('voice')} className="absolute top-12 right-6 z-[150] rounded-full bg-black/50 text-white"><X /></Button>
                    <div className="relative w-full h-full">
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                            <Video className="h-20 w-20 opacity-20" />
                            <p className="absolute bottom-20 font-black uppercase text-xs tracking-widest animate-pulse">Establishing Secure Feed...</p>
                        </div>
                        <div className="absolute bottom-10 right-6 w-32 h-48 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                    </div>
                </div>
            )}

            {/* BROWN DISPLAY BOARD */}
            {meeting?.displayVisible && (
                <div className="absolute inset-0 z-[100] bg-[#4e342e] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="max-w-5xl w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 relative shadow-2xl">
                        {isAdmin && (
                            <Button onClick={async () => await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { displayVisible: false })} variant="ghost" size="icon" className="absolute top-6 right-6 z-[100] rounded-full bg-black/50 hover:bg-black/80 text-white"><X className="h-6 w-6" /></Button>
                        )}
                        {meeting.displayType === 'image' && <Image src={meeting.displayUrl} alt="Display" fill className="object-contain" unoptimized />}
                        {meeting.displayType === 'video' && <video src={meeting.displayUrl} controls autoPlay className="w-full h-full" />}
                        {meeting.displayType === 'audio' && (
                            <div className="h-full w-full flex flex-col items-center justify-center gap-6 bg-white/5">
                                <Volume2 className="h-20 w-20 text-primary animate-pulse" />
                                <audio src={meeting.displayUrl} controls autoPlay className="w-full max-w-md" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <header className={cn(
                "p-4 pt-12 flex items-center justify-between border-b backdrop-blur-md z-[80]",
                isCall ? "bg-white/80 border-black/5" : "bg-black/50 border-white/10"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full animate-pulse", isCall ? "bg-primary" : "bg-red-500 shadow-[0_0_8px_red]")}></div>
                    <div>
                        <h2 className="font-black uppercase text-[10px] tracking-widest leading-none">{meeting?.name}</h2>
                        {timeLeft !== null && <p className="text-[8px] font-mono opacity-50 uppercase mt-1">Duration: {formatTime(timeLeft)}</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={endMeeting} className="h-8 rounded-full bg-destructive/10 text-destructive font-black uppercase text-[9px]">hang up</Button>
                    )}
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 overflow-y-auto">
                {isCall && activeMode === 'voice' ? (
                    <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                            <Avatar className="h-48 w-48 ring-4 ring-primary ring-offset-8 ring-offset-white shadow-2xl">
                                <AvatarImage src={otherParticipant?.avatar} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-primary text-white">{otherParticipant?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{otherParticipant?.name}</h3>
                            <p className="text-xs font-bold text-primary animate-pulse uppercase tracking-[0.3em]">
                                {meeting.status === 'started' ? 'Connected' : 'Ringing...'}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6 mt-10">
                            <div className="flex flex-col items-center gap-2">
                                <Button onClick={() => setActiveMode('video')} className="h-14 w-14 rounded-full bg-muted hover:bg-primary hover:text-white transition-all"><Video /></Button>
                                <span className="text-[10px] font-black uppercase">Video</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button onClick={() => setActiveMode('chat')} className="h-14 w-14 rounded-full bg-muted hover:bg-primary hover:text-white transition-all"><MessageSquare /></Button>
                                <span className="text-[10px] font-black uppercase">Chat</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button onClick={() => mediaInputRef.current?.click()} className="h-14 w-14 rounded-full bg-muted hover:bg-primary hover:text-white transition-all"><MonitorPlay /></Button>
                                <span className="text-[10px] font-black uppercase">Display</span>
                                <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleMediaUpload} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 max-w-6xl mx-auto py-10">
                        {participants.filter(p => p.userId !== user?.$id).map(p => (
                            <div key={p.$id} className="flex flex-col items-center gap-2">
                                <div className={cn("relative rounded-full border-2 p-0.5 h-14 w-14", p.isHost ? "border-yellow-500" : "border-primary/40")}>
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={p.avatar} className="object-cover" />
                                        <AvatarFallback className="font-black bg-muted">{p.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {isAdmin && !p.isHost && (
                                        <Button onClick={() => kickUser(p.$id)} variant="destructive" size="icon" className="absolute -top-1 -left-1 h-5 w-5 rounded-full"><X className="h-3 w-3" /></Button>
                                    )}
                                </div>
                                <p className="font-bold text-[8px] opacity-80 uppercase text-center truncate w-full">{p.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* FIXED BOTTOM SELF-ICON (Only for Meetings) */}
            {!isCall && myAttendee && (
                <div className="fixed bottom-24 right-6 z-[90] flex flex-col items-center gap-2 animate-in slide-in-from-right-10">
                    <div className="h-16 w-16 rounded-full border-4 border-primary overflow-hidden shadow-2xl bg-black">
                        {useCamera ? (
                            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                        ) : (
                            <img src={myAttendee.avatar} className="h-full w-full object-cover" alt="Me" />
                        )}
                    </div>
                    <span className="text-[8px] font-black uppercase bg-primary text-white px-2 py-0.5 rounded-full">Me</span>
                </div>
            )}

            {isAdmin && joinRequests.length > 0 && (
                <footer className="p-4 bg-white/5 border-t backdrop-blur-lg flex items-center gap-4 overflow-x-auto z-[80]">
                    {joinRequests.map(req => (
                        <div key={req.$id} className="flex items-center gap-2 bg-muted p-2 rounded-2xl border shrink-0">
                            <Avatar className="h-8 w-8"><AvatarImage src={req.avatar} /></Avatar>
                            <span className={cn("text-[9px] font-black uppercase", isCall ? "text-black" : "text-white")}>{req.name}</span>
                            <div className="flex gap-1 ml-2">
                                <Button size="sm" onClick={() => approveUser(req)} className="h-7 px-3 text-[8px] font-black uppercase rounded-full">Accept</Button>
                                <Button size="sm" variant="destructive" onClick={() => kickUser(req.$id)} className="h-7 px-3 text-[8px] font-black uppercase rounded-full">Deny</Button>
                            </div>
                        </div>
                    ))}
                </footer>
            )}

            <footer className={cn(
                "p-6 border-t flex justify-center safe-area-bottom z-[80]",
                isCall ? "bg-white border-black/5" : "bg-black border-white/10"
            )}>
                <Button variant="destructive" className="rounded-full h-12 px-8 font-black uppercase text-xs tracking-widest gap-2 shadow-xl" onClick={() => isAdmin ? endMeeting() : router.replace('/dashboard/meeting')}>
                    {isCall ? 'End Call' : 'Disconnect Meeting'}
                </Button>
            </footer>
        </div>
    );
}