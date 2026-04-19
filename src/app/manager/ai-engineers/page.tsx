'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
 * @fileOverview AI Engineers Management Hub v2.0.
 * FORCED: Instant keyboard focus on Upload.
 * SYNC: High-speed global brain management.
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

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const hasSession = sessionStorage.getItem('ipay_ai_engineer_session') === 'true';
        if (!hasSession) {
            router.replace('/auth/signin');
            return;
        }
        fetchKnowledge();
    }, [router]);

    useEffect(() => {
        if (activeTab === 'upload') {
            inputRef.current?.focus();
        }
    }, [activeTab]);

    const fetchKnowledge = useCallback(async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [
                Query.limit(100)
            ]);
            // In-memory sort to bypass index requirement
            const sorted = res.documents.sort((a: any, b: any) => 
                new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
            );
            setKnowledge(sorted);
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
            toast({ title: 'ACCEPTED', description: 'Knowledge uploaded instantly.' });
            fetchKnowledge();
            inputRef.current?.focus();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, id);
            toast({ title: 'DELETED', description: 'Record removed from global brain.' });
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
                        <TabsTrigger value="upload" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Upload</TabsTrigger>
                        <TabsTrigger value="detect" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Detect</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-8 space-y-8">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input 
                                    ref={inputRef}
                                    placeholder="Type knowledge to upload..." 
                                    value={uploadInput} 
                                    onChange={e => setUploadInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleUpload()}
                                    className="h-14 rounded-[1.5rem] bg-muted/50 border-none font-bold text-sm shadow-inner px-6"
                                />
                                <Button onClick={handleUpload} size="icon" className="h-14 w-14 rounded-[1.5rem] shadow-lg bg-primary shrink-0" disabled={isUploading || !uploadInput.trim()}>
                                    {isUploading ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black uppercase text-[10px] tracking-widest opacity-40">Knowledge Archive</h3>
                                {loading && <Loader2 className="h-3 w-3 animate-spin text-primary opacity-50" />}
                            </div>
                            
                            <div className="space-y-3">
                                {knowledge.map(item => (
                                    <div key={item.$id} className="p-5 rounded-[1.8rem] bg-white border shadow-sm group relative hover:border-primary/30 transition-all">
                                        <p className="text-sm font-bold leading-relaxed">{item.content}</p>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed opacity-40 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[7px] font-black uppercase tracking-widest">COMMIT: {new Date(item.$createdAt).toLocaleDateString()}</span>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.$id)} className="h-8 w-8 rounded-full text-destructive hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {!loading && knowledge.length === 0 && (
                                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                                        <Zap className="h-12 w-12" />
                                        <p className="font-black uppercase text-[10px] tracking-[0.3em]">Knowledge Bank Empty</p>
                                    </div>
                                )}
                            </div>
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
                                        placeholder="Ask Sofia a question..." 
                                        value={detectInput} 
                                        onChange={e => setDetectInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleDetect()}
                                        className="h-12 rounded-2xl bg-white/5 border-none font-bold text-xs text-white placeholder:text-white/20"
                                    />
                                    <Button onClick={handleDetect} className="h-12 px-6 rounded-2xl bg-white text-slate-900 hover:bg-white/90 font-black uppercase text-[10px] tracking-widest shadow-xl" disabled={isDetecting || !detectInput.trim()}>
                                        Test
                                    </Button>
                                </div>

                                {isDetecting ? (
                                    <div className="flex items-center gap-3 py-6 animate-pulse">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scanning Brain...</p>
                                    </div>
                                ) : detectResponse ? (
                                    <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/10">
                                        <p className="text-[8px] font-black uppercase text-primary mb-3">Brain Response:</p>
                                        <p className="text-sm font-bold leading-relaxed">{detectResponse}</p>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center opacity-30">
                                        <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Probe Active</p>
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