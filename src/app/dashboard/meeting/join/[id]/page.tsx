
'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Camera, ImageIcon, Loader2, Video, CheckCircle2, UploadCloud, ArrowLeft, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, ID, Query } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

/**
 * @fileOverview Meeting Join Lobby.
 * Validates session status and handles identity setup.
 */

function MeetingJoinContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user: authUser } = useUser();
    const meetingId = params.id as string;
    const isAdminLink = searchParams.get('role') === 'admin';

    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [step, setStep] = useState<'info' | 'waiting'>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [isFull, setIsFull] = useState(false);
    const [isUseCameraActive, setIsUseCameraActive] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkMeeting = async () => {
            if (!meetingId) return;
            try {
                const meeting = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
                
                if (meeting.status === 'ended') {
                    setIsExpired(true);
                    return;
                }

                if (meeting.type === 'personal' && !isAdminLink) {
                    const attendees = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                        Query.equal('meetingId', meetingId),
                        Query.equal('status', 'approved')
                    ]);
                    if (attendees.total >= 5) {
                        setIsFull(true);
                    }
                }
            } catch (e: any) {
                // Only mark as expired if document really doesn't exist
                if (e.code === 404) {
                    setIsExpired(true);
                }
            }
        };
        checkMeeting();

        const setupCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasCamera(true);
                }
            } catch (e) {
                setHasCamera(false);
            }
        };
        setupCamera();
    }, [meetingId, isAdminLink]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            setAvatar(canvas.toDataURL('image/png'));
            setIsUseCameraActive(true);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAvatar(ev.target?.result as string);
                setIsUseCameraActive(false);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleRequestJoin = async () => {
        if (!name || !avatar) {
            toast({ variant: 'destructive', title: 'Identity Required', description: 'Enter your name and provide a photo.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const meeting = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            const isActuallyAdmin = isAdminLink || authUser?.$id === meeting.hostId;

            if (meeting.type === 'personal' && !isActuallyAdmin) {
                const attendees = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                    Query.equal('meetingId', meetingId),
                    Query.equal('status', 'approved')
                ]);
                if (attendees.total >= 5) {
                    setIsFull(true);
                    setIsSubmitting(false);
                    return;
                }
            }

            const requestId = ID.unique();
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, {
                meetingId,
                userId: authUser?.$id || 'guest',
                name,
                avatar,
                status: isActuallyAdmin ? 'approved' : 'waiting',
                isHost: isActuallyAdmin,
                hasVideo: isUseCameraActive,
                hasAudio: true,
                createdAt: new Date().toISOString()
            });

            // Save meeting identity session
            sessionStorage.setItem(`meeting_guest_${meetingId}`, JSON.stringify({ 
                name, 
                avatar, 
                requestId,
                isHost: isActuallyAdmin,
                useCamera: isUseCameraActive 
            }));

            if (isActuallyAdmin) {
                router.replace(`/dashboard/meeting/room/${meetingId}`);
            } else {
                setStep('waiting');
                const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
                    const payload = response.payload as any;
                    if (payload.$id === requestId) {
                        if (payload.status === 'approved') {
                            router.replace(`/dashboard/meeting/room/${meetingId}`);
                        } else if (payload.status === 'declined') {
                            toast({ variant: 'destructive', title: 'Access Denied', description: 'you have been denied by the host' });
                            setStep('info');
                            setIsSubmitting(false);
                        }
                    }
                });
                return () => unsub();
            }

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsSubmitting(false);
        }
    };

    if (isExpired) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Card className="max-w-md w-full rounded-[2.5rem] shadow-xl border-none p-10">
                    <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">this meeting is expired</h2>
                    <p className="text-muted-foreground font-bold text-sm mt-2">The session has already concluded.</p>
                    <Button asChild className="w-full h-12 rounded-full font-black uppercase tracking-widest mt-8">
                        <Link href="/dashboard/meeting">Return to Hub</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    if (isFull) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Card className="max-w-md w-full rounded-[2.5rem] shadow-xl border-none p-10">
                    <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="h-10 w-10 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tighter">Room is Full</h2>
                    <p className="text-muted-foreground font-bold text-xs mt-2 italic">
                        the meeting with this id is personal and already 5 have joined
                    </p>
                    <Button asChild className="w-full h-12 rounded-full font-black uppercase tracking-widest mt-8">
                        <Link href="/dashboard/meeting">Return to Hub</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    if (step === 'waiting') {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-10">
                    <div className="h-32 w-32 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-white/20">
                            <img src={avatar || ''} className="h-full w-full object-cover" alt="Identity" />
                        </div>
                    </div>
                </div>
                <h2 className="text-white text-2xl font-black tracking-tighter">Lobby: {name}</h2>
                <p className="text-primary font-bold text-xs uppercase mt-2 animate-pulse">Waiting for admin approval...</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background flex flex-col p-6 overflow-y-auto pb-20">
            <header className="pt-10 mb-6 flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/meeting')} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Hub
                </Button>
                {isAdminLink && (
                    <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center shadow-sm">
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Chairman Link
                    </div>
                )}
            </header>
            <Card className="max-w-md w-full mx-auto rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-primary text-white p-8 text-center">
                    <CardTitle className="text-xl font-black uppercase tracking-widest leading-none">Welcome to I-pay meeting</CardTitle>
                    <CardDescription className="text-white/70 font-bold mt-2">Setup your identity before entry</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest">Display Name</Label>
                        <Input 
                            placeholder="Type your name..." 
                            className="h-12 rounded-2xl bg-muted border-none px-6 font-bold"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest">Identity Preview</Label>
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                            {avatar ? (
                                <img src={avatar} className="h-full w-full object-cover" alt="Preview" />
                            ) : (
                                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                            
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                                {avatar ? (
                                    <Button onClick={() => { setAvatar(null); setIsUseCameraActive(false); }} size="sm" variant="destructive" className="rounded-full font-black uppercase text-[9px] h-8 shadow-lg">Reset</Button>
                                ) : (
                                    <Button onClick={handleCapture} size="sm" className="rounded-full font-black uppercase text-[9px] h-8 shadow-lg" disabled={!hasCamera}><Camera className="mr-1 h-3 w-3" /> Use Camera</Button>
                                )}
                                <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="secondary" className="rounded-full font-black uppercase text-[9px] h-8 shadow-lg"><UploadCloud className="mr-1 h-3 w-3" /> Upload Icon</Button>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                    <Button onClick={handleRequestJoin} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting || !name || !avatar}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : isAdminLink ? 'Enter as Chairman' : 'Join Meeting'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function MeetingJoinPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <MeetingJoinContent />
        </Suspense>
    );
}
