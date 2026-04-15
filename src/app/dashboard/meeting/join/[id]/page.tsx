
'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Camera, ImageIcon, Loader2, CheckCircle2, UploadCloud, ArrowLeft, XCircle, Video as VideoIcon, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, ID, Query } from '@/lib/data-service';
import { useUser } from '@/hooks/use-user';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

/**
 * @fileOverview Meeting Identity Setup.
 * APPROVAL SHIELD: Admin (Host) bypasses waiting screen. All others MUST wait for approval.
 * SELFIE FORCE: "Front" button specifically forces user-facing camera and mirrors logic.
 */

function MeetingJoinContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user: authUser, profile: authProfile } = useUser();
    const meetingId = params.id as string;
    const isAdminLink = searchParams.get('role') === 'admin';

    const [meeting, setMeeting] = useState<any>(null);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [useLiveCamera, setUseLiveCamera] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [step, setStep] = useState<'info' | 'waiting' | 'expired' | 'full'>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [loadingMeeting, setLoadingMeeting] = useState(true);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = async (mode: 'user' | 'environment') => {
        if (!navigator?.mediaDevices) return;
        setFacingMode(mode);
        setUseLiveCamera(true);
        setAvatar(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: mode }, 
                audio: true 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setHasCamera(true);
            }
        } catch (e) {
            setHasCamera(false);
            toast({ variant: 'destructive', title: 'Camera Error' });
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkMeeting = async () => {
            if (!meetingId) return;
            setLoadingMeeting(true);
            try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
                setMeeting(doc);
                
                if (doc.type === 'personal') {
                    const attendees = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                        Query.equal('meetingId', meetingId),
                        Query.equal('status', 'approved')
                    ]);
                    if (attendees.total >= 5 && !isAdminLink && authUser?.$id !== doc.hostId) {
                        setStep('full');
                    }
                }

                if (doc.status === 'ended' || doc.status === 'cancelled') {
                    setStep('expired');
                }
            } catch (e: any) {
                if (e.code === 404) setStep('expired');
            } finally {
                setLoadingMeeting(false);
            }
        };
        checkMeeting();
        startCamera('user');
    }, [meetingId, authUser?.$id, isAdminLink]);

    useEffect(() => {
        if (authProfile) {
            setName(authProfile.username || '');
            if (!useLiveCamera) setAvatar(authProfile.avatar || null);
        }
    }, [authProfile, useLiveCamera]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAvatar(ev.target?.result as string);
                setUseLiveCamera(false);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleRequestJoin = async () => {
        if (!name || (!avatar && !useLiveCamera)) return;

        setIsSubmitting(true);
        try {
            const isActuallyHost = isAdminLink || authUser?.$id === meeting.hostId;
            const requestId = ID.unique();

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, {
                meetingId,
                userId: authUser?.$id || `guest_${Date.now()}`,
                name,
                avatar: avatar || 'live_stream',
                useCamera: useLiveCamera,
                facingMode: facingMode,
                status: isActuallyHost ? 'approved' : 'waiting',
                isHost: isActuallyHost,
                createdAt: new Date().toISOString()
            });

            if (typeof window !== 'undefined') {
                sessionStorage.setItem(`meeting_guest_${meetingId}`, JSON.stringify({ 
                    name, avatar, requestId, isHost: isActuallyHost, useCamera: useLiveCamera, facingMode 
                }));
            }

            // ADMIN BYPASS: Instantly enter if Host
            if (isActuallyHost) {
                router.replace(`/dashboard/meeting/room/${meetingId}`);
            } else {
                // GUEST WAIT: Stay on verifying screen until approved
                setStep('waiting');
                const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
                    const payload = response.payload as any;
                    if (payload.$id === requestId) {
                        if (payload.status === 'approved') router.replace(`/dashboard/meeting/room/${meetingId}`);
                        else if (payload.status === 'declined') {
                            toast({ variant: 'destructive', title: 'Entry Denied' });
                            setStep('info');
                            setIsSubmitting(false);
                        }
                    }
                });
                return () => unsub();
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sync Error' });
            setIsSubmitting(false);
        }
    };

    if (loadingMeeting) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    if (step === 'waiting') {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-10">
                    <div className="h-32 w-32 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-white/20">
                            {useLiveCamera ? (
                                <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover", facingMode === 'user' && "scale-x-[-1]")} />
                            ) : (
                                <img src={avatar || ''} className="h-full w-full object-cover" alt="Identity" />
                            )}
                        </div>
                    </div>
                </div>
                <h2 className="text-white text-3xl font-black tracking-tighter uppercase">Verifying...</h2>
                <p className="text-primary font-black text-xs uppercase mt-4 animate-pulse tracking-[0.2em]">Waiting for Chairman to Accept</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-6 overflow-y-auto">
            <header className="pt-10 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/meeting')} className="font-black uppercase text-[10px] gap-2"><ArrowLeft className="h-4 w-4" /> Hub</Button>
            </header>
            <Card className="max-w-md w-full mx-auto rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-primary text-white p-10 text-center">
                    <CardTitle className="text-xl font-black uppercase tracking-widest leading-none">Session Identity</CardTitle>
                    <CardDescription className="text-white/70 font-bold mt-2 uppercase text-[9px]">Select Camera Feed</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest pl-2">Display Name</Label>
                        <Input placeholder="Enter your name..." className="h-12 rounded-2xl bg-muted border-none px-6 font-bold" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-4">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest pl-2">Security Preview</Label>
                        <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                            {avatar && !useLiveCamera ? (
                                <img src={avatar} className="h-full w-full object-cover" alt="Preview" />
                            ) : (
                                <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover", facingMode === 'user' && "scale-x-[-1]")} />
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
                                <Button onClick={() => startCamera('user')} variant={facingMode === 'user' && useLiveCamera ? "default" : "secondary"} size="sm" className="flex-1 h-8 rounded-full text-[8px] font-black uppercase"><VideoIcon className="mr-1 h-3 w-3" /> Front</Button>
                                <Button onClick={() => startCamera('environment')} variant={facingMode === 'environment' && useLiveCamera ? "default" : "secondary"} size="sm" className="flex-1 h-8 rounded-full text-[8px] font-black uppercase"><Smartphone className="mr-1 h-3 w-3" /> Back</Button>
                                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" className="flex-1 h-8 rounded-full text-[8px] font-black uppercase"><UploadCloud className="mr-1 h-3 w-3" /> Icon</Button>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                    <Button onClick={handleRequestJoin} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-transform" disabled={isSubmitting || !name || (!avatar && !useLiveCamera)}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : isAdminLink || authUser?.$id === meeting?.hostId ? 'Join Hub Now' : 'Request Entry'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function MeetingJoinPage() {
    return <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}><MeetingJoinContent /></Suspense>;
}
