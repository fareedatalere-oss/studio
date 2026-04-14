'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Save, Loader2, KeyRound, Activity, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS, Query } from '@/lib/data-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Master User Preview & Edit Page.
 * SHIELDED: Universal null-guards to stop "Client-side exception".
 * FORCED: Decoupled loading for instant identity viewing.
 */

export default function ViewUserPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const userId = typeof params?.id === 'string' ? params.id : '';

    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingTx, setLoadingTx] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const safeDate = (val: any) => {
        if (!val) return null;
        try {
            if (typeof val.toDate === 'function') return val.toDate();
            if (typeof val.toMillis === 'function') return new Date(val.toMillis());
            if (val.seconds !== undefined) return new Date(val.seconds * 1000);
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) { return null; }
    };

    const fetchProfile = useCallback(async () => {
        if (!userId) return;
        setLoadingProfile(true);
        try {
            const data = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
            setProfile(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Error', description: 'Identity record not ready.' });
        } finally {
            setLoadingProfile(false);
        }
    }, [userId, toast]);

    const fetchTransactions = useCallback(async () => {
        if (!userId) return;
        setLoadingTx(true);
        try {
            const data = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                Query.equal('userId', userId),
                Query.limit(20)
            ]);
            
            // Client-side sorting to avoid index requirements
            const sorted = data.documents.sort((a, b) => {
                const dateA = safeDate(a.$createdAt)?.getTime() || 0;
                const dateB = safeDate(b.$createdAt)?.getTime() || 0;
                return dateB - dateA;
            });

            setTransactions(sorted);
        } catch (error: any) {
            console.error("Tx sync pending...");
        } finally {
            setLoadingTx(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchProfile();
            fetchTransactions();
        }
    }, [userId, fetchProfile, fetchTransactions]);

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            const { $id, uid, $createdAt, $updatedAt, email, ...updateData } = profile;
            const finalData = {
                ...updateData,
                nairaBalance: Number(profile.nairaBalance || 0),
                rewardBalance: Number(profile.rewardBalance || 0),
                clickCount: Number(profile.clickCount || 0),
            };
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, $id, finalData);
            toast({ title: 'Master Sync Complete' });
            setEditMode(false);
            fetchProfile();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setProfile((prev: any) => ({ ...prev, [id]: value }));
    };

    if (loadingProfile) {
        return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
    }
    
    if (!profile) {
        return (
            <div className="container py-20 text-center">
                <ShieldAlert className="mx-auto h-16 w-16 opacity-20 mb-4" />
                <p className="font-black uppercase text-sm tracking-widest opacity-50">Record Sync Pending</p>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl space-y-8 font-body">
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost" className="font-black uppercase text-[10px] tracking-widest">
                    <Link href="/manager/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                {editMode ? (
                    <Button onClick={handleSave} disabled={isSaving} className="h-12 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl px-10">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-4 w-4" />} Save Master Changes
                    </Button>
                ) : (
                    <Button onClick={() => setEditMode(true)} variant="outline" className="h-12 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg px-10 border-2">
                        <Edit className="mr-2 h-4 w-4" /> Edit Account
                    </Button>
                )}
            </div>

            <Card className={cn("rounded-[3rem] shadow-2xl border-none overflow-hidden", profile?.isBlocked && "ring-4 ring-destructive/20")}>
                <CardHeader className="bg-primary/5 pb-10 pt-10 text-center relative">
                    <Avatar className="h-32 w-32 border-8 border-white shadow-2xl mx-auto mb-6">
                        <AvatarImage src={profile?.avatar} className="object-cover" />
                        <AvatarFallback className="font-black text-4xl uppercase bg-primary text-white">{profile?.username?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-4xl font-black uppercase tracking-tighter">@{profile?.username || 'User'}</CardTitle>
                    <CardDescription className="font-bold text-xs opacity-60 uppercase">{profile?.email}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 pt-12">
                    <div className="space-y-4">
                        <h3 className="font-black uppercase text-[10px] tracking-widest opacity-30 flex items-center gap-2"><Activity className="h-3 w-3"/> Global Assets</h3>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-50 pl-1">Balance (₦)</Label>
                            <Input id="nairaBalance" type="number" value={profile?.nairaBalance || 0} onChange={handleInputChange} readOnly={!editMode} className="h-12 rounded-2xl border-none bg-primary/10 font-black text-primary text-xl px-6 shadow-inner" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-50 pl-1">Rewards</Label>
                            <Input id="rewardBalance" type="number" value={profile?.rewardBalance || 0} onChange={handleInputChange} readOnly={!editMode} className="h-12 rounded-2xl border-none bg-orange-50 font-black text-orange-600 text-xl px-6" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-black uppercase text-[10px] tracking-widest opacity-30 flex items-center gap-2"><ShieldAlert className="h-3 w-3"/> Verification</h3>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-50 pl-1">Virtual Account</Label>
                            <Input value={profile?.accountNumber || 'NOT GENERATED'} readOnly className="h-12 rounded-2xl border-none bg-muted font-mono font-bold px-6" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase opacity-50 pl-1">Transaction PIN</Label>
                            <div className="h-12 flex items-center gap-3 px-6 bg-primary/10 rounded-2xl text-primary font-black font-mono shadow-inner">
                                <KeyRound className="h-4 w-4" /> {profile?.pin || 'NOT SET'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-black uppercase text-[10px] tracking-widest opacity-30 flex items-center gap-2"><Activity className="h-3 w-3"/> System Flags</h3>
                        <div className="p-6 rounded-3xl bg-muted/30 border-2 border-dashed space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase">Blocked</span>
                                <Badge variant={profile?.isBlocked ? 'destructive' : 'outline'}>{profile?.isBlocked ? 'YES' : 'NO'}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase">Last Active</span>
                                <span className="text-[8px] font-bold opacity-50 truncate max-w-[80px]">
                                    {(() => {
                                        const d = safeDate(profile?.lastSeen);
                                        return d ? format(d, 'HH:mm') : 'Never';
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
