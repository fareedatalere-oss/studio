'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Cpu, ArrowLeft, Send, Trash2, Loader2, 
    CheckCircle2, AlertTriangle, ShieldCheck, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID, Query } from '@/lib/data-service';
import { chatSofia } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * @fileOverview AI Engineers Management Hub.
 * FORCED: High-speed knowledge uploading and pruning.
 */

export default function AiEngineersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('upload');
    const [knowledge, setKnowledge] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [uploadInput, setUploadInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [detectInput, setDetectInput] = useState('');
    const [detectResponse, setDetectResponse] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        const hasSession = sessionStorage.getItem('ipay_ai_engineer_session') === 'true';
        if (!hasSession) {
            router.replace('/auth/signin');
            return;
        }
        fetchKnowledge();
    }, [router]);

    const fetchKnowledge = useCallback(async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [
                Query.limit(100),
                Query.orderDesc('$createdAt')
            ]);
            setKnowledge(res.documents);
        } catch (e) {
            console.error("Knowledge Sync Latency...");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleUpload = async () => {
        if (!uploadInput.trim() || isUploading) return;
        
        setIsUploading(true);
        const fact = uploadInput.trim();
        setUploadInput('');

        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID.unique(), {
                content: fact,
                contributorId: 'ai_engineer',
                contributorName: 'System Engineer',
                topic: fact.substring(0, 50)
            });
            toast({ title: 'UPLOAD SUCCESS', description: 'Information committed to global brain.' });
            fetchKnowledge();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, id);
            toast({ title: 'FACT PURGED', description: 'Identity record removed from brain.' });
            setKnowledge(prev => prev.filter(k => k.$id !== id));
        } catch (e) {}
    };

    const handleDetect = async () => {
        if (!detectInput.trim() || isDetecting) return;
        setIsDetecting(true);
        try {
            const res = await chatSofia({
                message: detectInput,
                userId: 'engineer_test',
                username: 'Engineer',
                currentTime: new Date().toLocaleString()
            });
            setDetectResponse(res.text);
        } catch (e) {
            setDetectResponse("BRAIN_SYNC_ERROR: Logic Handshake Failed.");
        } finally {
            setIsDetecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background font-body pb-20">
            <header className="p-4 pt-12 border-b bg-muted/30 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => { sessionStorage.removeItem('ipay_ai_engineer_session'); router.push('/auth/signin'); }} className="rounded-full bg-background border shadow-sm h-10 w-10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-xl shadow-lg">
                            <Cpu className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="font-black uppercase text-xs tracking-widest text-primary">AI Engineer Hub</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="p-4 max-w-2xl mx-auto space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted h-14 rounded-[1.5rem] p-1 shadow-inner">
                        <TabsTrigger value="upload" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Knowledge Upload</TabsTrigger>
                        <TabsTrigger value="detect" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Logic Detection</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-8 space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 pb-6">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-center">Commit Global Fact</CardTitle>
                                <CardDescription className="text-center text-[10px] font-bold opacity-60">Write anything to add it to Sofia's brain bank.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="Write new information here..." 
                                            value={uploadInput} 
                                            onChange={e => setUploadInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleUpload()}
                                            className="h-12 rounded-2xl bg-muted/50 border-none font-bold text-xs shadow-inner"
                                        />
                                        <Button onClick={handleUpload} size="icon" className="h-12 w-12 rounded-2xl shadow-lg bg-primary shrink-0" disabled={isUploading || !uploadInput.trim()}>
                                            {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                        <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-blue-700 leading-tight">
                                            "Once uploaded, Sofia will repeat this information to ANY user on I-Pay when asked."
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h3 className="font-black uppercase text-[10px] tracking-widest opacity-40 ml-2">Current Knowledge Bank</h3>
                            {loading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary opacity-20" /></div>
                            ) : knowledge.length > 0 ? (
                                <div className="space-y-3">
                                    {knowledge.map(item => (
                                        <div key={item.$id} className="p-5 rounded-[1.8rem] bg-white border shadow-sm group relative hover:border-primary/30 transition-all">
                                            <p className="text-sm font-bold leading-relaxed">{item.content}</p>
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed">
                                                <span className="text-[8px] font-black uppercase text-muted-foreground opacity-50">Saved: {new Date(item.$createdAt).toLocaleDateString()}</span>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.$id)} className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                                    <Zap className="h-12 w-12" />
                                    <p className="font-black uppercase text-[10px] tracking-[0.3em]">Knowledge Bank Empty</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="detect" className="mt-8 space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white overflow-hidden">
                            <CardHeader className="bg-white/5 border-b border-white/5">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-center">Sofia Logic Probe</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Test a question..." 
                                        value={detectInput} 
                                        onChange={e => setDetectInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleDetect()}
                                        className="h-12 rounded-2xl bg-white/5 border-none font-bold text-xs text-white placeholder:text-white/20"
                                    />
                                    <Button onClick={handleDetect} className="h-12 px-6 rounded-2xl bg-white text-slate-900 hover:bg-white/90 font-black uppercase text-[10px] tracking-widest shadow-xl" disabled={isDetecting || !detectInput.trim()}>
                                        Detect
                                    </Button>
                                </div>

                                {isDetecting ? (
                                    <div className="flex items-center gap-3 py-6 animate-pulse">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scanning Brain...</p>
                                    </div>
                                ) : detectResponse ? (
                                    <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/10">
                                        <p className="text-[8px] font-black uppercase text-primary mb-3">Sofia Response:</p>
                                        <p className="text-sm font-bold leading-relaxed">{detectResponse}</p>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center opacity-30">
                                        <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Detection Active</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <footer className="mt-auto py-10 text-center opacity-30">
                <p className="text-[8px] font-black uppercase tracking-[0.5em]">I-Pay AI Engineering Level 5</p>
            </footer>
        </div>
    );
}
