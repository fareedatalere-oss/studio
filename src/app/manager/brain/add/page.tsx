'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Mic, Send, Volume2, Save, Loader2, BrainCircuit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, ID } from '@/lib/data-service';
import { cn } from '@/lib/utils';

/**
 * @fileOverview AI Knowledge Creator.
 * WORKFLOW: Question -> Answer -> Voice -> Save.
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
                toast({ title: 'Syncing Voice...', description: 'Uploading to local knowledge bank.' });
                
                const reader = new FileReader();
                const b64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });

                const res = await uploadToCloudinary(b64, 'video');
                if (res.success) {
                    setVoiceUrl(res.url);
                    toast({ title: 'Voice Synced' });
                }
                setIsProcessing(false);
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            setIsRecording(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Mic Error' });
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
            toast({ title: 'Knowledge Generated', description: 'Brain bank has been updated.' });
            router.push('/manager/brain');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 pt-20 max-w-2xl mx-auto font-body">
            <header className="mb-10 flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Cancel
                </Button>
                <div className="bg-primary/10 px-4 py-2 rounded-full">
                    <p className="text-[9px] font-black uppercase text-primary tracking-widest">Step {step} of 4</p>
                </div>
            </header>

            <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-muted/50 p-10 text-center">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Knowledge Builder</CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest ml-1">The Question</Label>
                            <Input 
                                placeholder="add question..." 
                                className="h-16 rounded-2xl bg-muted border-none px-6 font-bold text-lg focus-visible:ring-1 focus-visible:ring-primary shadow-inner" 
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                            />
                            <Button onClick={() => setStep(2)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" disabled={!question.trim()}>
                                Add Knowledge
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest ml-1">The Answer (Text)</Label>
                            <Input 
                                autoFocus
                                placeholder="Type anything you like..." 
                                className="h-16 rounded-2xl bg-muted border-none px-6 font-bold text-lg" 
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                            />
                            <Button onClick={() => setStep(3)} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" disabled={!answer.trim()}>
                                Next: Record Voice
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center gap-8 py-10 animate-in fade-in slide-in-from-bottom-2 text-center">
                            <p className="text-sm font-bold opacity-60">"Speak in the language what you write their"</p>
                            <Button 
                                onClick={isRecording ? stopRecording : startRecording} 
                                size="icon" 
                                className={cn(
                                    "h-32 w-32 rounded-full transition-all active:scale-95 shadow-2xl",
                                    isRecording ? "bg-red-500 animate-pulse" : "bg-primary"
                                )}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="h-12 w-12 animate-spin" /> : <Mic className="h-12 w-12" />}
                            </Button>
                            {voiceUrl && (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-3 bg-muted p-4 rounded-2xl">
                                        <Volume2 className="h-5 w-5 text-primary" />
                                        <span className="text-[10px] font-black uppercase">Voice Ready</span>
                                        <audio src={voiceUrl} controls className="h-8" />
                                    </div>
                                    <Button onClick={() => setStep(4)} variant="outline" className="rounded-full font-black uppercase text-[10px]">Review Logic</Button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95">
                            <div className="p-8 bg-muted/30 rounded-[2.5rem] space-y-6 border-2 border-dashed border-primary/20">
                                <div className="flex flex-col gap-2">
                                    <p className="text-[9px] font-black uppercase opacity-40">User Question (Left)</p>
                                    <p className="text-xl font-black text-primary leading-tight">"{question}"</p>
                                </div>
                                <div className="flex flex-col gap-2 border-t pt-6 border-black/5">
                                    <p className="text-[9px] font-black uppercase opacity-40">Sofia Answer</p>
                                    <p className="text-sm font-bold leading-relaxed">{answer}</p>
                                    {voiceUrl && <div className="mt-4"><audio src={voiceUrl} controls className="w-full h-8" /></div>}
                                </div>
                            </div>
                            <Button onClick={handleGenerate} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2 h-5 w-5" />}
                                Generate Prompt
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
