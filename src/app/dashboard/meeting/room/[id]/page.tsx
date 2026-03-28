'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
    Mic, Video as VideoIcon, PhoneOff, Settings, 
    MoreVertical, Loader2, Camera, ImageIcon, 
    PlayCircle, StopCircle, UserX, X, MessageSquare, Monitor, Eraser, Send,
    Clock, Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, COLLECTION_ID_PROFILES, COLLECTION_ID_MESSAGES, ID } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Query, Models } from 'appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

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
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [boardDraft, setBoardContent] = useState('');
    
    // Presence & Media States
    const [useCamera, setUseCamera] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const fetchMeeting = useCallback(async () => {
        try {
            const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(doc);
            setBoardContent(doc.boardContent || '');
            
            if (doc.status === 'ended') {
                toast({ title: 'Meeting Ended' });
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
            router.replace('/dashboard');
        } catch (e) {}
    };

    useEffect(() => {
        fetchMeeting();

        const unsub = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents.${meetingId}`, response => {
            const payload = response.payload as any;
            if (payload.status === 'ended') {
                router.replace('/dashboard');
            }
            setMeeting(payload);
            setBoardContent(payload.boardContent || '');
        });

        if (user?.$id) {
            setParticipants([{ id: user.$id, username: profile?.username, avatar: profile?.avatar, isHost: meeting?.hostId === user.$id }]);
        }

        return () => unsub();
    }, [meetingId, user?.$id, profile?.username, profile?.avatar]);

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
        if (!user || !meeting) return;

        if (meeting.type === 'personal') {
            const currentCount = participants.length;
            if (currentCount >= 5 && meeting.hostId !== user.$id) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Meeting Full', 
                    description: 'This personal meeting has reached its limit of 5 people.' 
                });
                return;
            }
        }

        setIsInRoom(true);

        if (meeting.hostId === user.$id && !meeting.startedAt) {
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { 
                    status: 'started',
                    startedAt: new Date().toISOString()
                });
            } catch (e) {
                console.error("Host failed to update meeting status", e);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startRecording = async (type: 'audio' | 'video') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: type === 'video' 
            });
            
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { 
                    type: type === 'video' ? 'video/mp4' : 'audio/webm' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `meeting-${type}-${Date.now()}.${type === 'video' ? 'mp4' : 'webm'}`;
                a.click();
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingType(type);
            toast({ title: `Recording ${type} started...` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Hardware Error' });
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        setRecordingType(null);
        toast({ title: 'Recording saved to device.' });
    };

    const updateBoard = async () => {
        if (meeting.hostId !== user?.$id) return;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { boardContent: boardDraft });
            toast({ title: 'Board Updated' });
        } catch (e) {}
    };

    const clearBoard = async () => {
        if (meeting.hostId !== user?.$id) return;
        setBoardContent('');
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { boardContent: '' });
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
                .catch(() => {});
        }
    }, [isInRoom, useCamera]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

    if (!isInRoom) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Card className="max-w-md w-full rounded-[3rem] overflow-hidden shadow-2xl border-none">
                    <div className="relative h-48 w-full bg-muted">
                        {meeting?.wallUrl && <Image src={meeting.wallUrl} alt="Wall" fill className="object-cover" />}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <VideoIcon className="h-16 w-16 text-white" />
                        </div>
                    </div>
                    <CardContent className="pt-8 space-y-4">
                        <h1 className="text-3xl font-black uppercase tracking-tighter">{meeting?.name}</h1>
                        <p className="text-sm font-bold text-muted-foreground">{meeting?.description}</p>
                        <div className="flex items-center justify-center gap-4 text-xs font-black uppercase">
                            <div className="flex items-center gap-1 text-primary">
                                <Clock className="h-3 w-3" />
                                <span>{meeting?.type === 'personal' ? '1 Hour' : '3 Hours'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <CalendarIcon className="h-3 w-3" />
                                <span>{meeting?.date} @ {meeting?.time}</span>
                            </div>
                        </div>
                        <Button onClick={startSession} className="w-full h-16 rounded-full font-black uppercase tracking-widest text-lg shadow-xl mt-4">
                            {meeting?.hostId === user?.$id ? 'Start Meeting' : 'Enter Meeting'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen w-full relative overflow-hidden bg-black flex flex-col font-body">
            {meeting?.wallUrl && (
                <div className="absolute inset-0 z-0 opacity-20">
                    <Image src={meeting.wallUrl} alt="Wall" fill className="object-cover blur-md scale-110" />
                </div>
            )}

            <header className="relative z-20 p-4 bg-black/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-red-500 h-2.5 w-2.5 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                    <div className="flex flex-col">
                        <h2 className="text-white font-black uppercase text-[10px] tracking-widest truncate max-w-[100px]">{meeting?.name}</h2>
                        {timeLeft !== null && <p className="text-white font-mono text-[8px]">{formatTime(timeLeft)} remaining</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant={recordingType === 'audio' ? 'destructive' : 'secondary'} 
                        className="rounded-full font-black text-[9px] uppercase gap-1 h-8"
                        onClick={() => isRecording ? stopRecording() : startRecording('audio')}
                    >
                        {isRecording && recordingType === 'audio' ? <StopCircle className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        {isRecording && recordingType === 'audio' ? 'Stop' : 'Record Voice'}
                    </Button>
                    <Button 
                        size="sm" 
                        variant={recordingType === 'video' ? 'destructive' : 'secondary'} 
                        className="rounded-full font-black text-[9px] uppercase gap-1 h-8"
                        onClick={() => isRecording ? stopRecording() : startRecording('video')}
                    >
                        {isRecording && recordingType === 'video' ? <StopCircle className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />}
                        {isRecording && recordingType === 'video' ? 'Stop' : 'Record Video'}
                    </Button>
                </div>
            </header>

            <main className="flex-1 relative z-10 p-6 flex flex-col items-center justify-center">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-8 max-w-4xl w-full justify-items-center">
                    {participants.map((p) => (
                        <div key={p.id} className="flex flex-col items-center gap-2 group">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="relative cursor-pointer transition-transform hover:scale-110">
                                        <Avatar className="h-20 w-20 border-4 border-primary/40 p-1">
                                            <AvatarImage src={p.avatar || `https://picsum.photos/seed/${p.id}/200`} />
                                            <AvatarFallback className="font-black text-xl uppercase bg-primary text-white">{p.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {p.isHost && <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 border-2 border-black"><Settings className="h-3 w-3 text-black" /></div>}
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-[300px] rounded-[2.5rem] p-6 border-none shadow-2xl">
                                    <div className="space-y-4">
                                        <Button className="w-full rounded-2xl h-12 font-black uppercase text-xs gap-2" onClick={() => setViewingUser(p)}>
                                            <Monitor className="h-4 w-4" /> View User
                                        </Button>
                                        <Button variant="secondary" className="w-full rounded-2xl h-12 font-black uppercase text-xs gap-2" asChild>
                                            <Link href={`/dashboard/meeting/room/${meetingId}/chat/${p.id}`}>
                                                <MessageSquare className="h-4 w-4" /> Private Text
                                            </Link>
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white uppercase tracking-tighter">@{p.username}</p>
                                <p className="text-[8px] font-bold text-primary animate-pulse uppercase">Speaking</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="relative z-20 p-6 bg-gradient-to-t from-black to-transparent flex items-center justify-between gap-4">
                <Dialog open={isBoardOpen} onOpenChange={setIsBoardOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-14 w-14 rounded-full bg-white/10 border-white/20 text-white shadow-xl">
                            <Monitor className="h-6 w-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl h-[80vh] flex flex-col rounded-[3rem] p-8 border-none shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <DialogHeader className="border-b pb-4">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="font-black uppercase tracking-widest text-sm">Meeting Board</DialogTitle>
                                {meeting?.hostId === user?.$id && (
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" onClick={clearBoard}><Eraser className="h-4 w-4 text-destructive" /></Button>
                                        <Button size="icon" variant="ghost" onClick={updateBoard}><Send className="h-4 w-4 text-primary" /></Button>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="flex-1 py-6">
                            {meeting?.hostId === user?.$id ? (
                                <Textarea 
                                    className="h-full resize-none border-none text-lg font-bold placeholder:opacity-30" 
                                    placeholder="Admin only: Write on the board..."
                                    value={boardDraft}
                                    onChange={(e) => setBoardContent(e.target.value)}
                                />
                            ) : (
                                <div className="h-full w-full bg-muted/30 rounded-3xl p-6 overflow-y-auto">
                                    <p className="whitespace-pre-wrap font-bold text-lg leading-relaxed">{boardDraft || "Board is currently empty."}</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {meeting?.hostId === user?.$id ? (
                    <Button 
                        onClick={endMeeting} 
                        className="h-16 flex-1 rounded-full font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 shadow-2xl"
                    >
                        End Meeting for All
                    </Button>
                ) : (
                    <Button onClick={() => router.push('/dashboard')} className="h-16 flex-1 rounded-full font-black uppercase tracking-widest bg-white/10 border-white/20 text-white">
                        Leave Room
                    </Button>
                )}

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/10 text-white" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className={cn("h-12 w-12 rounded-full", useCamera ? "bg-primary text-white" : "bg-white/10 text-white")} onClick={() => setUseCamera(!useCamera)}><Camera className="h-5 w-5" /></Button>
                </div>
            </footer >

            {viewingUser && (
                <div className="fixed inset-0 z-50 bg-black animate-in fade-in zoom-in duration-300">
                    <div className="relative h-full w-full">
                        <Image src={viewingUser.avatar || `https://picsum.photos/seed/${viewingUser.id}/800`} alt="User" fill className="object-cover" />
                        <Button 
                            variant="ghost" size="icon" 
                            className="absolute top-10 right-6 h-12 w-12 rounded-full bg-black/40 text-white backdrop-blur-md"
                            onClick={() => setViewingUser(null)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                            <p className="text-white font-black uppercase text-[10px] tracking-widest">Watching @{viewingUser.username}</p>
                        </div>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
        </div>
    );
}