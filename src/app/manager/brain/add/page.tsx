'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Mic, Send, Volume2, Save, Loader2, BrainCircuit, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, ID } from '@/lib/data-service';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Recursive AI Knowledge Builder v2.0.
 * WORKFLOW: Question (Visible) -> Answer (Visible Left) -> Voice (Sync) -> Preview -> Generate.
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
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const resetForm = () => {
        setStep(1);
        setQuestion('');
        setAnswer('');
        setVoiceUrl('');
        setIsRecording(false);
        setIsProcessing(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setIsProcessing(true);
                
                const reader = new FileReader();
                const b64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });

                const res = await uploadToCloudinary(b64, 'video');
                if (res.success) {
                    setVoiceUrl(res.url);
                    toast({ title: 'Voice Captured' });
                } else {
                    toast({ variant: 'destructive', title: 'Upload Failed' });
                }
                setIsProcessing(false);
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            setIsRecording(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Microphone Error' });
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleGenerate = async () => {
        setIsProcessing(true);
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, ID.unique(), {
                keyword: question.trim(),
                answer: answer.trim(),
                voiceUrl: voiceUrl,
                createdAt: new Date().toISOString()
            });
            toast({ title: 'Knowledge Saved!', description: 'Brain has been updated.' });
            // RESET AND GO BACK TO PROMPT START
            resetForm();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Database Error', description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const playVoice = () => {
        if (voiceUrl) {
            const audio = new Audio(voiceUrl);
            audio.play();
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 pt-20 max-w-2xl mx-auto font-body">
            <header className="mb-10 flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push('/manager/brain')} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Exit Builder
                </Button>
                <div className="bg-primary/10 px-4 py-2 rounded-full">
                    <p className="text-[9px] font-black uppercase text-primary tracking-widest">Step {step} of 4</p>
                </div>
            </header>

            <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-muted/50 p-10 text-center">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">AI Knowledge Builder</CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    
                    {/* VISIBLE PROGRESSION SUMMARY */}
                    {step > 1 && (
                        <div className="space-y-4 border-b border-dashed pb-8">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-primary tracking-widest opacity-50">Question</p>
                                <p className="text-lg font-black leading-tight text-foreground">"{question}"</p>
                            </div>
                            {step > 2 && (
                                <div className="space-y-1 text-left">
                                    <p className="text-[9px] font-black uppercase text-primary tracking-widest opacity-50">Answer</p>
                                    <p className="text-sm font-bold leading-relaxed opacity-80">{answer}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 1: ADD QUESTION */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest ml-1 text-primary">add question</Label>
                                <Input 
                                    placeholder="Enter question here..." 
                                    className="h-16 rounded-2xl bg-muted border-none px-6 font-bold text-lg focus-visible:ring-1 focus-visible:ring-primary shadow-inner" 
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button onClick={() => setStep(2)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" disabled={!question.trim()}>
                                Add Knowledge <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* STEP 2: ADD ANSWER */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest ml-1 text-primary">add answer</Label>
                                <Input 
                                    placeholder="Type the answer Sofia will give..." 
                                    className="h-16 rounded-2xl bg-muted border-none px-6 font-bold text-lg focus-visible:ring-1 focus-visible:ring-primary shadow-inner" 
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button onClick={() => setStep(3)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" disabled={!answer.trim()}>
                                Next: Voice Sync <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* STEP 3: RECORD VOICE */}
                    {step === 3 && (
                        <div className="flex flex-col items-center gap-8 py-6 animate-in fade-in slide-in-from-bottom-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                "Speak in the language what you write their"
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
                                {isProcessing ? <Loader2 className="h-12 w-12 animate-spin" /> : <Mic className="h-12 w-12" />}
                            </Button>
                            
                            {voiceUrl && !isRecording && (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="flex items-center gap-3 bg-muted p-4 rounded-3xl border">
                                        <Volume2 className="h-5 w-5 text-primary" />
                                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">Voice Synced</span>
                                    </div>
                                    <Button onClick={() => setStep(4)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest">
                                        Final Preview <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: FINAL PREVIEW & GENERATE */}
                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95">
                            <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 space-y-8">
                                <div className="text-center">
                                    <h3 className="font-black uppercase text-[10px] tracking-[0.3em] text-primary mb-6">Review Identity</h3>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm inline-block">
                                        <Button onClick={playVoice} size="icon" className="h-16 w-16 rounded-full bg-primary shadow-lg animate-bounce">
                                            <Volume2 className="h-8 w-8 text-white" />
                                        </Button>
                                    </div>
                                    <p className="text-[8px] font-bold uppercase opacity-40 mt-2">Click to listen</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6 text-left">
                                    <div className="p-4 bg-background rounded-2xl shadow-sm border border-black/5">
                                        <p className="text-[8px] font-black uppercase text-primary opacity-50 mb-1">Trigger Question</p>
                                        <p className="text-sm font-black leading-tight">"{question}"</p>
                                    </div>
                                    <div className="p-4 bg-background rounded-2xl shadow-sm border border-black/5">
                                        <p className="text-[8px] font-black uppercase text-primary opacity-50 mb-1">Sofia's Knowledge</p>
                                        <p className="text-sm font-bold leading-relaxed">{answer}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" onClick={() => setStep(3)} className="h-14 rounded-2xl font-black uppercase tracking-widest border-2">
                                    Re-Record
                                </Button>
                                <Button onClick={handleGenerate} className="h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2 h-5 w-5" />}
                                    Generate
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted p-6 justify-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 text-center">
                        I-Pay Internal Intelligence Builder Protocol
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
