
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
    Mic, Video as VideoIcon, PhoneOff, Settings, 
    MoreVertical, Loader2, Camera, ImageIcon, 
    PlayCircle, StopCircle, UserX, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isInRoom, setIsInRoom] = useState(false);
    
    // Presence States
    const [useCamera, setUseCamera] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Recording States
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);

    useEffect(() => {
        const fetchMeeting = async () => {
            try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
                setMeeting(doc);
                if (doc.status === 'ended') {
                    toast({ title: 'Meeting Ended', description: 'This session is no longer active.' });
                    router.replace('/dashboard/meeting');
                }
            } catch (e) {
                router.replace('/dashboard/meeting');
            } finally {
                setLoading(false);
            }
        };
        fetchMeeting();

        // Real-time status sync
        const unsub = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${meetingId}`, response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') {
                toast({ title: 'Meeting Terminated', description: 'The host has ended the session.' });
                router.replace('/dashboard');
            }
            setMeeting(payload);
        });

        return () => unsub();
    }, [meetingId, router, toast]);

    const startSession = async () => {
        if (!user || !meeting) return;
        if (meeting.hostId === user.$id) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'started' });
        }
        setIsInRoom(true);
    };

    const endMeeting = async () => {
        if (!meeting || meeting.hostId !== user?.$id) return;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
            router.push('/dashboard');
        } catch (e) {}
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAvatarUrl(ev.target?.result as string);
                setUseCamera(false);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    useEffect(() => {
        if (isInRoom && useCamera && videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
                .catch(() => toast({ variant: 'destructive', title: 'Hardware Error', description: 'Camera or Mic access denied.' }));
        }
    }, [isInRoom, useCamera, toast]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

    // LOBBY / LANDING PAGE
    if (!isInRoom) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Card className="max-w-md w-full rounded-[3rem] overflow-hidden shadow-2xl border-none">
                    <div className="relative h-48 w-full bg-muted">
                        {meeting.wallUrl && <Image src={meeting.wallUrl} alt="Wall" fill className="object-cover" />}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <VideoIcon className="h-16 w-16 text-white" />
                        </div>
                    </div>
                    <CardContent className="pt-8 space-y-4">
                        <h1 className="text-3xl font-black uppercase tracking-tighter">{meeting.name}</h1>
                        <p className="text-sm font-bold text-muted-foreground">{meeting.description}</p>
                        <div className="grid grid-cols-2 gap-4 py-4 border-y">
                            <div><p className="text-[10px] font-black uppercase opacity-50">Date</p><p className="font-bold">{meeting.date}</p></div>
                            <div><p className="text-[10px] font-black uppercase opacity-50">Time</p><p className="font-bold">{meeting.time}</p></div>
                        </div>
                        <Button onClick={startSession} className="w-full h-16 rounded-full font-black uppercase tracking-widest text-lg shadow-xl mt-4">
                            {meeting.hostId === user?.$id ? 'Start Meeting' : 'Enter Meeting'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ACTIVE ROOM PAGE
    return (
        <div className="h-screen w-full relative overflow-hidden bg-black flex flex-col">
            {/* Background Wall Image */}
            {meeting.wallUrl && (
                <div className="absolute inset-0 z-0 opacity-40">
                    <Image src={meeting.wallUrl} alt="Wall" fill className="object-cover blur-sm scale-110" />
                </div>
            )}

            {/* Header Controls */}
            <header className="relative z-20 p-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500 h-3 w-3 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                    <h2 className="text-white font-black uppercase text-xs tracking-widest">{meeting.name} (LIVE)</h2>
                </div>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant={isRecordingAudio ? 'destructive' : 'secondary'} 
                        className="rounded-full font-black text-[10px] uppercase gap-2 h-9"
                        onClick={() => setIsRecordingAudio(!isRecordingAudio)}
                    >
                        {isRecordingAudio ? <StopCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        {isRecordingAudio ? 'Recording...' : 'Record Audio'}
                    </Button>
                    <Button 
                        size="sm" 
                        variant={isRecordingVideo ? 'destructive' : 'secondary'} 
                        className="rounded-full font-black text-[10px] uppercase gap-2 h-9"
                        onClick={() => setIsRecordingVideo(!isRecordingVideo)}
                    >
                        {isRecordingVideo ? <StopCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        {isRecordingVideo ? 'Rec Video' : 'Record Video'}
                    </Button>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl aspect-video bg-black/60 rounded-[3rem] border border-white/10 overflow-hidden relative shadow-2xl">
                    {useCamera ? (
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                            ) : (
                                <UserX className="h-24 w-24 text-white/20" />
                            )}
                        </div>
                    )}
                    
                    {/* Floating Controls Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-4 rounded-full border border-white/20 shadow-2xl">
                        <Button 
                            variant="ghost" size="icon" 
                            className={cn("h-12 w-12 rounded-full", useCamera ? "bg-primary text-white" : "bg-white/10 text-white")}
                            onClick={() => setUseCamera(true)}
                        >
                            <Camera className="h-6 w-6" />
                        </Button>
                        <Button 
                            variant="ghost" size="icon" 
                            className={cn("h-12 w-12 rounded-full", !useCamera ? "bg-primary text-white" : "bg-white/10 text-white")}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="h-6 w-6" />
                        </Button>
                        <div className="w-px h-8 bg-white/20 mx-2"></div>
                        <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => router.back()}>
                            <PhoneOff className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </main>

            {/* Host Control Footer */}
            {meeting.hostId === user?.$id && (
                <footer className="relative z-20 p-6 flex justify-center bg-gradient-to-t from-black to-transparent">
                    <Button 
                        onClick={endMeeting} 
                        className="h-16 px-12 rounded-full font-black uppercase tracking-widest text-lg bg-red-600 hover:bg-red-700 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                    >
                        End Meeting for All
                    </Button>
                </footer>
            )}
        </div>
    );
}
