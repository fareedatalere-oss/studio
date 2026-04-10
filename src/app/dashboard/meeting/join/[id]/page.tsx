'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, ImageIcon, Loader2, Video, CheckCircle2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, ID } from '@/lib/appwrite';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

export default function MeetingJoinPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const meetingId = params.id as string;

    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [step, setStep] = useState<'info' | 'waiting'>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
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
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            setAvatar(canvas.toDataURL('image/png'));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setAvatar(ev.target?.result as string);
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
            const requestId = ID.unique();
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, {
                meetingId,
                name,
                avatar,
                status: 'waiting',
                isHost: false,
                createdAt: new Date().toISOString()
            });

            sessionStorage.setItem(`meeting_guest_${meetingId}`, JSON.stringify({ name, avatar, requestId }));
            setStep('waiting');

            // Wait for Admin Approval
            const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
                const payload = response.payload as any;
                if (payload.$id === requestId) {
                    if (payload.status === 'approved') {
                        router.replace(`/dashboard/meeting/room/${meetingId}`);
                    } else if (payload.status === 'declined') {
                        toast({ variant: 'destructive', title: 'Access Denied', description: 'The admin declined your request.' });
                        setStep('info');
                        setIsSubmitting(false);
                    }
                }
            });

            return () => unsub();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsSubmitting(false);
        }
    };

    if (step === 'waiting') {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-10">
                    <div className="h-32 w-32 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-white/20">
                            <img src={avatar || ''} className="h-full w-full object-cover" />
                        </div>
                    </div>
                </div>
                <h2 className="text-white text-2xl font-black uppercase tracking-tighter">Lobby: @{name}</h2>
                <p className="text-primary font-bold text-xs uppercase mt-2 animate-pulse">Waiting for admin to let you in...</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background flex flex-col p-6 overflow-y-auto pb-20">
            <Card className="max-w-md w-full mx-auto rounded-[2.5rem] shadow-2xl border-none overflow-hidden mt-10">
                <CardHeader className="bg-primary text-white p-8 text-center">
                    <CardTitle className="text-2xl font-black uppercase tracking-widest">Meeting Identity</CardTitle>
                    <CardDescription className="text-white/70 font-bold">Prepare your feed to enter</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest">Display Name</Label>
                        <Input 
                            placeholder="Your Name..." 
                            className="h-12 rounded-2xl bg-muted border-none px-6 font-bold"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest">Live Face / Icon</Label>
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                            {avatar ? (
                                <img src={avatar} className="h-full w-full object-cover" />
                            ) : (
                                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                            
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                                {avatar ? (
                                    <Button onClick={() => setAvatar(null)} size="sm" variant="destructive" className="rounded-full font-black uppercase text-[9px] h-8">Reset</Button>
                                ) : (
                                    <Button onClick={handleCapture} size="sm" className="rounded-full font-black uppercase text-[9px] h-8" disabled={!hasCamera}><Camera className="mr-1 h-3 w-3" /> Capture</Button>
                                )}
                                <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="secondary" className="rounded-full font-black uppercase text-[9px] h-8"><UploadCloud className="mr-1 h-3 w-3" /> Upload</Button>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                    <Button onClick={handleRequestJoin} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting || !name || !avatar}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Enter Meeting'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
