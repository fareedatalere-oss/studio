'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Trash2, Volume2, Database, Loader2, Image as ImageIcon, Film, MessageSquare, Search } from 'lucide-react';
import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, Query } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

/**
 * @fileOverview Intelligence Bank Explorer.
 * REPOSITORY: Displays all saved prompts and media.
 */

export default function BrainVaultPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [view, setView] = useState<'prompt' | 'media'>('prompt');
    const [knowledge, setKnowledge] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchVault = useCallback(async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, [
                Query.limit(100),
                Query.orderDesc('$createdAt')
            ]);
            setKnowledge(res.documents);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (sessionStorage.getItem('ipay_ai_vault_access') !== 'true') {
            router.replace('/manager/brain/vault/bypass');
            return;
        }
        fetchVault();
    }, [router, fetchVault]);

    const handleDelete = async (id: string) => {
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, id);
            setKnowledge(prev => prev.filter(k => k.$id !== id));
            toast({ title: 'Memory Deleted', description: 'Sofia has forgotten this information.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error' });
        }
    };

    const filtered = knowledge.filter(k => 
        k.keyword?.toLowerCase().includes(search.toLowerCase()) ||
        k.answer?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background p-6 pt-20 font-body">
            <header className="max-w-4xl mx-auto mb-10 flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push('/manager/brain')} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Core
                </Button>
                <div className="flex gap-2">
                    <Button variant={view === 'prompt' ? 'default' : 'outline'} size="sm" onClick={() => setView('prompt')} className="rounded-full font-black uppercase text-[9px] tracking-widest px-6 h-10">Prompt Hub</Button>
                    <Button variant={view === 'media' ? 'default' : 'outline'} size="sm" onClick={() => setView('media')} className="rounded-full font-black uppercase text-[9px] tracking-widest px-6 h-10">Media Bank</Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto space-y-6">
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                    <Input 
                        placeholder="Search local memory..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-12 rounded-2xl bg-muted border-none pl-12 font-bold shadow-inner"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                ) : view === 'prompt' ? (
                    <div className="grid gap-4">
                        {filtered.length > 0 ? filtered.map(k => (
                            <Card key={k.$id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-muted/30">
                                <CardContent className="p-6 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 space-y-1">
                                            <p className="text-[9px] font-black uppercase text-primary tracking-widest">Trigger Question</p>
                                            <p className="text-lg font-black leading-tight">"{k.keyword}"</p>
                                        </div>
                                        {k.voiceUrl && (
                                            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-primary/10 text-primary" onClick={() => {
                                                const a = new Audio(k.voiceUrl);
                                                a.play();
                                            }}>
                                                <Volume2 className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="p-4 bg-background rounded-2xl border border-black/5">
                                        <p className="text-[9px] font-black uppercase opacity-30 mb-1">Knowledge Answer</p>
                                        <p className="text-sm font-bold leading-relaxed">{k.answer}</p>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-destructive h-8 px-4 rounded-full font-black uppercase text-[9px] gap-2">
                                                    <Trash2 className="h-3 w-3" /> Forget Prompt
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-[2.5rem]">
                                                <AlertDialogHeader><AlertDialogTitle>Wipe this memory?</AlertDialogTitle><AlertDialogDescription>This will permanently remove this knowledge from Sofia's local brain.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter className="flex-row gap-2">
                                                    <AlertDialogCancel className="flex-1 rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(k.$id)} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">Forget It</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : <div className="text-center py-20 opacity-20"><Database className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-xs">Bank is Empty</p></div>}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-4 border-dashed border-muted">
                        <div className="flex gap-4 justify-center mb-6">
                            <ImageIcon className="h-12 w-12 opacity-10" />
                            <Film className="h-12 w-12 opacity-10" />
                        </div>
                        <p className="font-black uppercase text-xs tracking-widest opacity-30">Media Analysis Bank Coming Soon</p>
                    </div>
                )}
            </main>
        </div>
    );
}
