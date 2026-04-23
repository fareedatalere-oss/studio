
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Trash2, Volume2, Database, Loader2, Image as ImageIcon, Film, Clock, Calendar } from 'lucide-react';
import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, Query } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
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
 * @fileOverview Master AI Brain Vault v2.0.
 * REPOSITORY: Displays all saved knowledge with playback and deletion.
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
            toast({ title: 'Memory Deleted', description: 'This knowledge has been wiped from the brain.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    };

    const filtered = knowledge.filter(k => 
        k.keyword?.toLowerCase().includes(search.toLowerCase()) ||
        k.answer?.toLowerCase().includes(search.toLowerCase())
    );

    const playVoice = (url: string) => {
        const a = new Audio(url);
        a.play();
    };

    return (
        <div className="min-h-screen bg-background p-6 pt-20 font-body max-w-4xl mx-auto">
            <header className="mb-10 flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push('/manager/brain')} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Core
                </Button>
                <div className="flex gap-2">
                    <Button variant={view === 'prompt' ? 'default' : 'outline'} size="sm" onClick={() => setView('prompt')} className="rounded-full font-black uppercase text-[9px] px-6 h-10 tracking-widest">Questions</Button>
                    <Button variant={view === 'media' ? 'default' : 'outline'} size="sm" onClick={() => setView('media')} className="rounded-full font-black uppercase text-[9px] px-6 h-10 tracking-widest">Media</Button>
                </div>
            </header>

            <div className="relative mb-8">
                <Input 
                    placeholder="Search Brain Memory..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-12 rounded-2xl bg-muted border-none pl-6 font-bold shadow-inner"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
            ) : view === 'prompt' ? (
                <div className="space-y-6">
                    {filtered.length > 0 ? filtered.map(k => (
                        <Card key={k.$id} className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-muted/30">
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-primary tracking-widest opacity-50">Question (Left)</p>
                                        <p className="text-lg font-black leading-tight text-foreground">"{k.keyword}"</p>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <p className="text-[9px] font-black uppercase text-primary tracking-widest opacity-50">Answer (Right)</p>
                                        <p className="text-sm font-bold leading-relaxed opacity-80">{k.answer}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-dashed pt-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span className="text-[9px] font-black uppercase">{format(new Date(k.$createdAt), 'PP')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span className="text-[9px] font-black uppercase">{format(new Date(k.$createdAt), 'HH:mm:ss')}</span>
                                        </div>
                                        {k.voiceUrl && (
                                            <Button onClick={() => playVoice(k.voiceUrl)} size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 text-primary">
                                                <Volume2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive h-8 px-4 rounded-full font-black uppercase text-[9px] gap-2">
                                                <Trash2 className="h-3 w-3" /> Delete Memory
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2rem]">
                                            <AlertDialogHeader><AlertDialogTitle>Wipe Memory?</AlertDialogTitle><AlertDialogDescription>Delete this question and answer pairing entirely from Sofia's local brain.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter className="flex-row gap-2">
                                                <AlertDialogCancel className="flex-1 rounded-xl">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(k.$id)} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">Confirm Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    )) : <div className="text-center py-20 opacity-20"><Database className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-xs">No Records Found</p></div>}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-4 border-dashed">
                    <div className="flex gap-4 justify-center mb-6">
                        <ImageIcon className="h-12 w-12 opacity-10" />
                        <Film className="h-12 w-12 opacity-10" />
                    </div>
                    <p className="font-black uppercase text-xs tracking-widest opacity-30">Media Knowledge Coming Soon</p>
                </div>
            )}
        </div>
    );
}
