
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Mic, Send, Volume2, Save, Loader2, BrainCircuit, CheckCircle2, ChevronRight, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, ID } from '@/lib/data-service';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Master Knowledge Builder v3.5.
 * FIXED: Removed conflicting 'use server' directive.
 * SYNC: Hardened Cloudinary handshake for voice synchronization.
 */

export default function AddKnowledgePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [voiceUrl, setVoiceUrl] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const resetForm = () => {
        setStep(1);
        setQuestion('');
        setAnswer('');
        setVoiceUrl('');
        setRecordedBlob(null);
        setIsRecording(false);
        setIsProcessing(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const chunks: Blob[] = [];
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setRecordedBlob(blob);
                setVoiceUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Mic Access Denied' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleUploadAndSave = async () => {
        if (!question.trim() || !answer.trim()) {
            toast({ variant: 'destructive', title: 'Missing Data', description: 'Question and Answer are required.' });
            return;
        }
        
        setIsProcessing(true);
        toast({ title: 'Committing to Brain...', description: 'Syncing data with the cloud hub.' });

        try {
            let finalVoiceUrl = '';

            // 1. Upload Voice if exists
            if (recordedBlob) {
                const reader = new FileReader();
                const b64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(recordedBlob);
                });

                const res = await uploadToCloudinary(b64, 'video');
                if (res && res.success) {
                    finalVoiceUrl = res.url;
                } else {
                    const errorMsg = res?.message || "Cloudinary Handshake Failure.";
                    throw new Error(errorMsg);
                }
            }

            // 2. Save to Master Database
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, ID.unique(), {
                keyword: question.trim().toLowerCase(),
                answer: answer.trim(),
                voiceUrl: finalVoiceUrl || null,
                createdAt: new Date().toISOString()
            });
            
            toast({ title: 'Knowledge Generated!', description: 'Sofia has memorized this entry.' });
            
            // 3. Auto Reset for next entry
            resetForm();
        } catch (e: any) {
            console.error("Master Sync Error:", e);
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message || "An unexpected network error occurred." });
        } finally {
            setIsProcessing(false);
        }
    };

    const playPreview = () => {
        if (voiceUrl) {
            const audio = new Audio(voiceUrl);
            audio.play().catch(err => toast({ variant: 'destructive', title: 'Audio Error' }));
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 pt-20 max-w-2xl mx-auto font-body">
            <header className="mb-10 flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push('/manager/brain')} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Exit Hub
                </Button>
                <div className="bg-primary/10 px-4 py-2 rounded-full">
                    <p className="text-[9px] font-black uppercase text-primary tracking-widest">Step {step} of 4</p>
                </div>
            </header>

            <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-card">
                <CardHeader className="bg-muted/50 p-10 text-center border-b">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Teaching Sofia</CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    
                    {step > 1 && (
                        <div className="space-y-4 border-b border-dashed pb-8 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-primary tracking-widest opacity-50">Trigger Question</p>
                                <p className="text-xl font-black leading-tight text-foreground">"{question}"</p>
                            </div>
                            {step > 2 && (
                                <div className="space-y-1 text-left">
                                    <p className="text-[9px] font-black uppercase text-primary tracking-widest opacity-50 text-left">Sofia's Answer</p>
                                    <p className="text-sm font-bold leading-relaxed opacity-80">{answer}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest ml-1 text-primary">Question</Label>
                                <Input 
                                    placeholder="What will users ask?" 
                                    className="h-16 rounded-2xl bg-muted border-none px-6 font-bold text-lg focus-visible:ring-1 focus-visible:ring-primary shadow-inner" 
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button onClick={() => setStep(2)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" disabled={!question.trim()}>
                                Save Question <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest ml-1 text-primary">Answer</Label>
                                <Input 
                                    placeholder="What should Sofia say?" 
                                    className="h-16 rounded-2xl bg-muted border-none px-6 font-bold text-lg focus-visible:ring-1 focus-visible:ring-primary shadow-inner" 
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button onClick={() => setStep(3)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" disabled={!answer.trim()}>
                                Save Answer <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center gap-8 py-6 animate-in fade-in slide-in-from-bottom-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                "Speak the exact answer clearly"
                            </p>
                            <Button 
                                onClick={isRecording ? stopRecording : startRecording} 
                                size="icon" 
                                className={cn(
                                    "h-32 w-32 rounded-full transition-all active:scale-95 shadow-2xl",
                                    isRecording ? "bg-red-500 animate-pulse ring-8 ring-red-500/20" : "bg-primary"
                                )}
                                disabled={isProcessing}
                            >
                                {isRecording ? <Square className="h-12 w-12" /> : <Mic className="h-12 w-12" />}
                            </Button>
                            
                            {recordedBlob && !isRecording && (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="flex items-center justify-center gap-3 bg-primary/10 p-4 rounded-3xl border border-primary/20">
                                        <Volume2 className="h-5 w-5 text-primary" />
                                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">Voice Captured</span>
                                    </div>
                                    <Button onClick={() => setStep(4)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest">
                                        View Master Preview <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95">
                            <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 space-y-8">
                                <div className="text-center">
                                    <h3 className="font-black uppercase text-[10px] tracking-[0.3em] text-primary mb-6">Review Handshake</h3>
                                    <div className="bg-white p-4 rounded-full shadow-xl inline-block border-4 border-primary/10">
                                        <Button onClick={playPreview} size="icon" className="h-20 w-20 rounded-full bg-primary shadow-lg active:scale-90 transition-transform">
                                            <Volume2 className="h-10 w-10 text-white" />
                                        </Button>
                                    </div>
                                    <p className="text-[8px] font-bold uppercase opacity-40 mt-3">Click to verify voice</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6 text-left">
                                    <div className="p-5 bg-background rounded-2xl shadow-sm border border-black/5">
                                        <p className="text-[8px] font-black uppercase text-primary opacity-50 mb-1">User Question</p>
                                        <p className="text-sm font-black leading-tight text-foreground">"{question}"</p>
                                    </div>
                                    <div className="p-5 bg-background rounded-2xl shadow-sm border border-black/5">
                                        <p className="text-[8px] font-black uppercase text-primary opacity-50 mb-1">AI Logic</p>
                                        <p className="text-sm font-bold leading-relaxed">{answer}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" onClick={() => setStep(3)} className="h-14 rounded-2xl font-black uppercase tracking-widest border-2" disabled={isProcessing}>
                                    Re-Record
                                </Button>
                                <Button onClick={handleUploadAndSave} className="h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <BrainCircuit className="mr-2 h-5 w-5" />}
                                    Generate
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted p-6 justify-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 text-center">
                        I-Pay master intelligence builder
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
