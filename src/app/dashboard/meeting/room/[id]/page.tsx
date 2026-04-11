'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Video, Volume2, Mic, MicOff, X,
    MonitorPlay, Send, MessageSquare, Heart, Play, Pause, UploadCloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_MESSAGES, COLLECTION_ID_PROFILES, client, Query, ID, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

const LOVE_EMOJIS = ["😍", "♥️", "😍", "🥰", "😋", "🤩", "😘", "🧡", "💔", "❣️", "❤️‍🩹", "❤️", "💓", "💗", "🩷", "💖", "💞", "💘", "💕", "💚", "💟", "💌", "🖤", "🩶", "🤍", "💋", "🫦", "👄", "🫂", "👥", "🧑‍🧑‍🧒‍🧒", "👨‍👧‍👧", "👩‍👧", "👩‍👩‍👧‍👦", "👨‍👦", "👨‍👩‍👧‍👧", "👨‍👨‍👧‍👧", "👩‍👩‍👦‍👦", "👨‍👨‍👦‍👦", "👩‍👩‍👦", "👩‍👩‍👧‍👦", "💏", "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨", "👩‍❤️‍💋‍👩", "👩‍❤️‍👩", "👨‍❤️‍👨", "👩‍❤️‍👨", "💑"];

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isInRoom, setIsInRoom] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);
    
    const [participants, setParticipants] = useState<any[]>([]);
    const [partnerProfile, setPartnerProfile] = useState<any>(null);
    
    const [useCamera, setUseCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Call Mode States
    const [activeMode, setActiveMode] = useState<'voice' | 'video' | 'chat' | 'display'>('voice');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    const isAdmin = useMemo(() => user?.$id === meeting?.hostId, [user?.$id, meeting?.hostId]);
    const isCall = useMemo(() => meeting?.type === 'call', [meeting?.type]);

    const postCallLog = async (durationStr: string) => {
        if (!user || !meeting) return;
        const otherId = meeting.invitedUsers?.find((id: string) => id !== meeting.hostId) || meeting.hostId;
        const threadId = [meeting.hostId, otherId].sort().join('_');
        
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
            chatId: threadId,
            senderId: 'ipay_system',
            text: `📞 Call Finished: ${durationStr}`,
            status: 'sent',
            createdAt: new Date().toISOString()
        }).catch(() => {});
    };

    const endCall = async () => {
        if (isCall && meeting.status === 'started') {
            const m = Math.floor(durationSeconds / 60);
            const s = durationSeconds % 60;
            const dur = `${m}:${s.toString().padStart(2, '0')}`;
            await postCallLog(dur);
        }
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
            router.replace('/dashboard/chat');
        } catch (e) {
            router.replace('/dashboard/chat');
        }
    };

    const handleEntry = useCallback(async (docData: any) => {
        if (isInRoom) return;
        
        const guestDataStr = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        let guestData = guestDataStr ? JSON.parse(guestDataStr) : null;

        // CRITICAL FIX: If we are a logged in user entering a call room, auto-initialize identity
        if (!guestData && user && profile) {
            guestData = { name: profile.username, avatar: profile.avatar, useCamera: false };
            
            // Auto-register as attendee to prevent redirection loops
            try {
                const attendees = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                    Query.equal('meetingId', meetingId),
                    Query.equal('userId', user.$id)
                ]);
                
                if (attendees.total === 0) {
                    await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, ID.unique(), {
                        meetingId,
                        userId: user.$id,
                        name: profile.username,
                        avatar: profile.avatar,
                        status: 'approved',
                        isHost: user.$id === docData.hostId,
                        hasVideo: false,
                        hasAudio: true,
                        createdAt: new Date().toISOString()
                    });
                }
                sessionStorage.setItem(`meeting_guest_${meetingId}`, JSON.stringify(guestData));
            } catch (e) {
                console.error("Auto-entry registration failed", e);
            }
        }

        if (!guestData) {
            router.replace(`/dashboard/meeting/join/${meetingId}${isAdmin ? '?role=admin' : ''}`);
            return;
        }

        setIsInRoom(true);
        setUseCamera(guestData.useCamera || false);
    }, [meetingId, isAdmin, isInRoom, router, user, profile]);

    const fetchMeeting = useCallback(async () => {
        try {
            const docData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(docData);
            
            if (docData.status === 'ended') {
                router.replace('/dashboard/chat');
                return;
            }

            await handleEntry(docData);

            if (docData.type === 'call' && user) {
                const otherId = docData.invitedUsers?.find((id: string) => id !== user.$id) || (user.$id === docData.hostId ? null : docData.hostId);
                if (otherId) {
                    const otherProf = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, otherId).catch(() => null);
                    setPartnerProfile(otherProf);
                }
            }

            if (docData.status === 'started' && docData.startedAt) {
                const elapsed = Math.floor((Date.now() - new Date(docData.startedAt).getTime()) / 1000);
                setDurationSeconds(elapsed);
            }
        } catch (e) {
            router.replace('/dashboard/chat');
        } finally {
            setLoading(false);
        }
    }, [meetingId, router, handleEntry, user]);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            const approved = res.documents.filter(a => a.status === 'approved');
            setParticipants(approved);

            if (isAdmin && approved.length >= 2 && meeting?.status === 'pending') {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, {
                    status: 'started',
                    startedAt: new Date().toISOString()
                });
            }
        } catch (e) {}
    }, [meetingId, isAdmin, meeting?.status]);

    useEffect(() => {
        if (!user) return;
        fetchMeeting();
        fetchAttendees();

        const unsubMeeting = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${meetingId}`], response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') router.replace('/dashboard/chat');
            setMeeting(payload);
        });

        const unsubAttendees = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
            const payload = response.payload as any;
            if (payload.meetingId === meetingId) fetchAttendees();
        });

        const unsubChat = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
            const payload = response.payload as any;
            if (payload.chatId === `call_chat_${meetingId}`) {
                setChatMessages(prev => [...prev, payload]);
            }
        });

        return () => { unsubMeeting(); unsubAttendees(); unsubChat(); };
    }, [meetingId, fetchMeeting, fetchAttendees, user]);

    useEffect(() => {
        if (isInRoom && (useCamera || activeMode === 'video')) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                localStreamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            }).catch(() => setUseCamera(false));
        } else if (isInRoom) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                localStreamRef.current = stream;
            }).catch(() => {});
        }
        
        return () => localStreamRef.current?.getTracks().forEach(t => t.stop());
    }, [isInRoom, useCamera, activeMode]);

    useEffect(() => {
        if (!isInRoom || meeting?.status !== 'started') return;
        const interval = setInterval(() => {
            setDurationSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isInRoom, meeting?.status]);

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingMedia(true);
        toast({ title: 'Sharing media to board...' });
        try {
            const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(upload.$id);
            const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, {
                displayVisible: true, displayUrl: url, displayType: type
            });
        } catch (e) {} finally { setIsUploadingMedia(false); }
    };

    const sendCallChat = async () => {
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

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (loading || !meeting) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    const partner = participants.find(p => p.userId !== user.$id);
    const isConnected = meeting.status === 'started';
    
    // Identity resolution: Use attendee record if joined, fallback to partner profile if ringing
    const displayAvatar = partner?.avatar || partnerProfile?.avatar;
    const displayName = partner?.name || partnerProfile?.username;

    return (
        <div className={cn("h-screen w-full flex flex-col overflow-hidden relative font-body transition-colors duration-500", isCall ? "bg-white text-black" : "bg-black text-white")}>
            
            {/* CALL CHAT OVERLAY */}
            {isCall && activeMode === 'chat' && (
                <div className="absolute inset-0 z-[150] bg-white flex flex-col p-6 animate-in slide-in-from-bottom-5">
                    <header className="flex items-center justify-between border-b pb-4 mb-4">
                        <h2 className="font-black uppercase text-xs tracking-widest">Call Chat</h2>
                        <Button variant="ghost" size="icon" onClick={() => setActiveMode('voice')} className="rounded-full bg-muted"><X className="h-5 w-5" /></Button>
                    </header>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={cn("flex flex-col max-w-[80%]", msg.senderId === user.$id ? "ml-auto items-end" : "items-start")}>
                                <div className={cn("p-3 rounded-2xl text-xs font-bold shadow-sm", msg.senderId === user.$id ? "bg-primary text-white" : "bg-muted text-black")}>{msg.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-t pt-2">
                            {LOVE_EMOJIS.map((e, i) => <button key={i} onClick={() => setChatInput(prev => prev + e)} className="text-xl hover:scale-125 transition-transform">{e}</button>)}
                        </div>
                        <div className="flex gap-2">
                            <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type love message..." className="rounded-full bg-muted border-none h-12 text-black font-bold" />
                            <Button size="icon" onClick={sendCallChat} className="rounded-full h-12 w-12 bg-primary shadow-lg"><Send className="h-5 w-5 text-white"/></Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CALL VIDEO OVERLAY */}
            {isCall && activeMode === 'video' && (
                <div className="absolute inset-0 z-[140] bg-black flex flex-col items-center justify-center animate-in zoom-in-95">
                    <Button variant="ghost" size="icon" onClick={() => setActiveMode('voice')} className="absolute top-12 right-6 z-[150] rounded-full bg-black/50 text-white"><X /></Button>
                    <div className="relative w-full h-full">
                        <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center gap-4">
                            <Video className="h-20 w-20 opacity-20" />
                            <p className="font-black uppercase text-[10px] tracking-[0.3em] opacity-30 animate-pulse">Switching to Live Feed...</p>
                        </div>
                        <div className="absolute bottom-10 right-6 w-32 h-48 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                    </div>
                </div>
            )}

            {/* BROWN DISPLAY BOARD (Blackboard) */}
            {meeting?.displayVisible && (
                <div className="absolute inset-0 z-[100] bg-[#4e342e] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="max-w-5xl w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 relative shadow-2xl">
                        <Button onClick={async () => await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { displayVisible: false })} variant="ghost" size="icon" className="absolute top-6 right-6 z-[100] rounded-full bg-black/50 text-white"><X /></Button>
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

            <header className={cn("p-4 pt-12 flex flex-col items-center border-b z-[80]", isCall ? "bg-white border-black/5" : "bg-black border-white/10")}>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">{isCall ? 'I-Pay End-to-End Call' : meeting?.name}</p>
                <h2 className="text-xl font-black mt-1">
                    {isConnected ? formatDuration(durationSeconds) : 'Ringing...'}
                </h2>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 overflow-y-auto">
                {isCall && activeMode === 'voice' ? (
                    <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
                        <div className="relative">
                            <div className={cn("absolute inset-0 bg-primary/10 rounded-full animate-ping -m-4", !isConnected && "hidden")}></div>
                            <Avatar className="h-48 w-48 ring-4 ring-primary ring-offset-8 ring-offset-white shadow-2xl">
                                <AvatarImage src={displayAvatar} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-primary text-white">{displayName?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black lowercase tracking-tighter">{displayName || 'Contacting...'}</h3>
                            <p className="text-xs font-bold text-primary animate-pulse uppercase mt-2 tracking-widest">
                                {isConnected ? 'Connected' : 'Ringing Device...'}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-6 mt-12 w-full max-w-sm px-4">
                            <div className="flex flex-col items-center gap-2">
                                <Button onClick={() => setActiveMode('chat')} size="icon" className="h-12 w-12 rounded-full bg-muted hover:bg-primary transition-all shadow-md"><MessageSquare className="h-5 w-5 text-black"/></Button>
                                <span className="text-[8px] font-black uppercase">Chat</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button onClick={() => setActiveMode('video')} size="icon" className="h-12 w-12 rounded-full bg-muted hover:bg-primary transition-all shadow-md"><Video className="h-5 w-5 text-black" /></Button>
                                <span className="text-[8px] font-black uppercase">Video</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button onClick={() => mediaInputRef.current?.click()} size="icon" className="h-12 w-12 rounded-full bg-muted hover:bg-primary transition-all shadow-md"><MonitorPlay className="h-5 w-5 text-black" /></Button>
                                <span className="text-[8px] font-black uppercase">Display</span>
                                <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleMediaUpload} />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button variant="destructive" onClick={endCall} size="icon" className="h-12 w-12 rounded-full shadow-lg"><PhoneOff className="h-5 w-5 text-white" /></Button>
                                <span className="text-[8px] font-black uppercase">Hang Up</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 max-w-6xl mx-auto py-10">
                        {participants.map(p => (
                            <div key={p.$id} className="flex flex-col items-center gap-2">
                                <div className={cn("relative rounded-full border-2 p-0.5 h-14 w-14", p.isHost ? "border-yellow-500" : "border-primary/40 shadow-lg")}>
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={p.avatar} className="object-cover" />
                                        <AvatarFallback className="font-black bg-muted">{p.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <p className="font-bold text-[8px] opacity-80 uppercase text-center truncate w-full">{p.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {!isCall && (
                <footer className={cn("p-8 border-t flex justify-center safe-area-bottom z-[80]", isCall ? "bg-white border-black/5" : "bg-black border-white/10")}>
                    <Button variant="destructive" className="rounded-full h-14 px-10 font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-90" onClick={endCall}>
                        <PhoneOff className="mr-2 h-5 w-5" /> Hang Up
                    </Button>
                </footer>
            )}
        </div>
    );
}
