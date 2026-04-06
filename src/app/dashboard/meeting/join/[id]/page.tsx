
'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, ImageIcon, Loader2, Video, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, ID } from '@/lib/appwrite';
import Image from 'next/image';

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
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setAvatar(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleRequestJoin = async () => {
        if (!name || !avatar) {
            toast({ variant: 'destructive', title: 'Details Required', description: 'Please enter your name and choose an avatar.' });
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

            setStep('waiting');

            // Listen for host approval
            const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents.${requestId}`], response => {
                const payload = response.payload as any;
                if (payload.status === 'approved') {
                    router.replace(`/dashboard/meeting/room/${meetingId}`);
                } else if (payload.status === 'declined') {
                    toast({ variant: 'destructive', title: 'Request Denied', description: 'The host has declined your request to join.' });
                    setStep('info');
                    setIsSubmitting(false);
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
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Card className="max-w-md w-full rounded-[3rem] p-10 shadow-2xl border-none space-y-8">
                    <div className="relative mx-auto">
                        <Loader2 className="h-32 w-32 animate-spin text-primary opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Avatar className="h-20 w-20 ring-4 ring-primary p-1">
                                <AvatarImage src={avatar || ''} />
                                <AvatarFallback className="font-black text-2xl uppercase bg-primary text-white">{name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Waiting for Admin...</h2>
                        <p className="text-sm font-bold text-muted-foreground mt-2 italic">@{name}, the host has been notified of your presence.</p>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Request Status: Pending</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background flex flex-col items-center justify-center p-6">
            <Card className="max-w-md w-full rounded-[3rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground p-8 text-center">
                    <div className="mx-auto h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                        <Video className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Join Meeting</CardTitle>
                    <CardDescription className="text-white/70 font-bold">Identity setup for this session</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest">Your Display Name</Label>
                        <Input 
                            placeholder="Enter your name..." 
                            className="h-14 rounded-2xl bg-muted border-none px-6 font-black text-lg"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest">Meeting Avatar</Label>
                        <div className="flex gap-4 items-center">
                            <div 
                                className="h-24 w-24 rounded-[2rem] bg-muted border-2 border-dashed border-primary/20 flex items-center justify-center cursor-pointer overflow-hidden relative group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatar ? (
                                    <Image src={avatar} alt="Avatar" fill className="object-cover" />
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-muted-foreground opacity-30" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <Button variant="outline" className="w-full rounded-2xl h-10 font-black uppercase text-[9px] tracking-widest" onClick={() => fileInputRef.current?.click()}>
                                    Choose Photo
                                </Button>
                                <p className="text-[8px] font-bold text-muted-foreground leading-tight italic">Select a clear face photo from your gallery or use camera.</p>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                </CardContent>
                <CardFooter className="p-8 bg-muted/30">
                    <Button onClick={handleRequestJoin} className="w-full h-16 rounded-full font-black uppercase tracking-widest text-lg shadow-xl" disabled={isSubmitting || !name || !avatar}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Request to Join'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function Avatar({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}>{children}</div>;
}
function AvatarImage({ src }: { src: string }) {
    return <img src={src} className="aspect-square h-full w-full object-cover" />;
}
function AvatarFallback({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}>{children}</div>;
}
