'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Save, Loader2, KeyRound, Wallet, MousePointer2, Gift, ShieldAlert, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS, Query } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ViewUserPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const userId = params.id as string;

    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const profileData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
            const transactionsData = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                Query.equal('userId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(20)
            ]);

            setProfile(profileData);
            setTransactions(transactionsData.documents);
        } catch (error: any) {
            console.error("Fetch Error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
            router.push('/manager/users');
        } finally {
            setLoading(false);
        }
    }, [userId, router, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, email, ...updateData } = profile;
            
            const finalData = {
                ...updateData,
                nairaBalance: Number(profile.nairaBalance || 0),
                rewardBalance: Number(profile.rewardBalance || 0),
                clickCount: Number(profile.clickCount || 0),
            };

            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, $id, finalData);
            toast({ title: 'Account Updated!' });
            setEditMode(false);
            fetchData();
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

    const handleSuspendToggle = async () => {
        if (!profile) return;
        setIsSaving(true);
        const newBannedState = !profile.isBanned;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, profile.$id, { isBanned: newBannedState });
            setProfile((prev: any) => ({ ...prev, isBanned: newBannedState }));
            toast({ title: newBannedState ? 'Account Suspended' : 'Account Reinstated' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="container py-8 max-w-5xl space-y-6">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-3xl">
                <Button asChild variant="ghost" className="font-black uppercase text-[10px]">
                    <Link href="/manager/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub</Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant={profile.isBanned ? "outline" : "destructive"} onClick={handleSuspendToggle} disabled={isSaving} className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest px-6 shadow-md">
                        {profile.isBanned ? <UserX className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                        {profile.isBanned ? 'Unsuspend' : 'Suspend Account'}
                    </Button>
                    {editMode ? (
                        <Button onClick={handleSave} disabled={isSaving} className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest px-6 shadow-md">
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                            Update Master Record
                        </Button>
                    ) : (
                        <Button onClick={() => setEditMode(true)} className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest px-6 shadow-md">
                            <Edit className="mr-2 h-4 w-4" /> Edit Values
                        </Button>
                    )}
                </div>
            </div>

            <Card className={cn("rounded-[2.5rem] shadow-2xl border-none overflow-hidden", profile.isBanned && "ring-4 ring-destructive/20 bg-destructive/5")}>
                <CardHeader className="bg-primary/5 pb-8">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                            <AvatarImage src={profile.avatar} className="object-cover" />
                            <AvatarFallback className="font-black text-2xl uppercase bg-primary text-white">{profile.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">@{profile.username || 'N/A'}</CardTitle>
                            <CardDescription className="font-bold opacity-70">{profile.email || 'No Linked Email'}</CardDescription>
                            {profile.isBanned && <Badge variant="destructive" className="mt-3 font-black uppercase text-[9px] px-3">Restricted User</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Username</Label><Input id="username" value={profile.username || ''} onChange={handleInputChange} readOnly={!editMode} className="rounded-xl border-none bg-muted/50 font-bold" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">First Name</Label><Input id="firstName" value={profile.firstName || ''} onChange={handleInputChange} readOnly={!editMode} className="rounded-xl border-none bg-muted/50" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Last Name</Label><Input id="lastName" value={profile.lastName || ''} onChange={handleInputChange} readOnly={!editMode} className="rounded-xl border-none bg-muted/50" /></div>
                    
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50 flex items-center gap-1 text-primary"><Wallet className="h-3 w-3" /> Balance (₦)</Label><Input id="nairaBalance" type="number" value={profile.nairaBalance || 0} onChange={handleInputChange} readOnly={!editMode} className="rounded-xl border-none bg-primary/5 font-black text-primary text-lg" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50 flex items-center gap-1 text-orange-500"><Gift className="h-3 w-3" /> Rewards</Label><Input id="rewardBalance" type="number" value={profile.rewardBalance || 0} onChange={handleInputChange} readOnly={!editMode} className="rounded-xl border-none bg-orange-50 font-black text-orange-600" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50 flex items-center gap-1 text-blue-500"><MousePointer2 className="h-3 w-3" /> Clicks</Label><Input id="clickCount" type="number" value={profile.clickCount || 0} onChange={handleInputChange} readOnly={!editMode} className="rounded-xl border-none bg-blue-50 font-black text-blue-600" /></div>

                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Virtual Account</Label><Input value={profile.accountNumber || 'Not Active'} readOnly className="rounded-xl border-none bg-muted font-mono font-bold" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">BVN / NIN</Label><Input value={profile.bvn || 'Not Linked'} readOnly className="rounded-xl border-none bg-muted font-mono" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Master PIN</Label><div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl text-primary font-black font-mono"><KeyRound className="h-4 w-4" /> {profile.pin || 'NONE'}</div></div>
                </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] shadow-xl border-none">
                <CardHeader><CardTitle className="font-black uppercase text-sm tracking-widest opacity-40">Recent Activity Log</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow className="border-none hover:bg-transparent"><TableHead className="font-black uppercase text-[10px]">Event</TableHead><TableHead className="font-black uppercase text-[10px]">Time</TableHead><TableHead className="font-black uppercase text-[10px]">Status</TableHead><TableHead className="text-right font-black uppercase text-[10px]">Value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? transactions.map(tx => (
                                <TableRow key={tx.$id} className="border-muted/20">
                                    <TableCell><div className="font-bold capitalize text-xs">{tx.type.replace('_', ' ')}</div><div className="text-[9px] opacity-50 truncate max-w-[120px]">{tx.recipientName || tx.narration}</div></TableCell>
                                    <TableCell className="text-[9px] font-bold opacity-50">{format(new Date(tx.$createdAt), 'PPp')}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(tx.status)} className="text-[8px] font-black uppercase tracking-tighter h-4">{tx.status}</Badge></TableCell>
                                    <TableCell className={cn("text-right font-black text-xs", tx.type === 'deposit' ? 'text-green-600' : 'text-red-600')}>{tx.type === 'deposit' ? '+' : '-'} ₦{tx.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center h-24 text-xs font-bold opacity-30 uppercase tracking-widest">No activity found</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
