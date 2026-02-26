
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Save, Loader2, KeyRound, Wallet, MousePointer2, Gift, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { Models, Query } from 'appwrite';
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
            let profileData;
            try {
                profileData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
            } catch (err) {
                console.error("Profile Fetch Error:", err);
                throw new Error("Could not find this user's profile document.");
            }

            let transactionsData;
            try {
                transactionsData = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                    Query.equal('userId', userId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(50)
                ]);
            } catch (err) {
                console.warn("Transactions Fetch Warning:", err);
                transactionsData = { documents: [] };
            }

            setProfile(profileData);
            setTransactions(transactionsData.documents);
        } catch (error: any) {
            console.error("Overall Fetch Error:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not load user data.' });
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
            // Remove internal Appwrite fields before sending update
            const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, email, ...updateData } = profile;
            
            // Ensure numbers are numbers
            const finalData = {
                ...updateData,
                nairaBalance: Number(profile.nairaBalance || 0),
                rewardBalance: Number(profile.rewardBalance || 0),
                clickCount: Number(profile.clickCount || 0),
            };

            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, $id, finalData);
            toast({ title: 'Success', description: 'User account and balances updated successfully.' });
            setEditMode(false);
            fetchData(); // reload data
        } catch (error: any) {
            console.error("Save Error:", error);
            toast({ variant: 'destructive', title: 'Save failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setProfile((prev: any) => ({ ...prev, [id]: value }));
    };

    if (loading) {
        return (
            <div className="container py-8 space-y-6">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="w-full h-64 rounded-xl" />
                <Skeleton className="w-full h-96 rounded-xl" />
            </div>
        );
    }

    if (!profile) {
        return <div className="container py-8 text-center">User profile not found.</div>;
    }
    
    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="container py-8 space-y-6">
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost">
                    <Link href="/manager/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Users</Link>
                </Button>
                {editMode ? (
                     <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Account Changes
                    </Button>
                ) : (
                    <Button onClick={() => setEditMode(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Account & Balances
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile.avatar} />
                            <AvatarFallback>{profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{profile.username || 'Full User Record'}</CardTitle>
                            <CardDescription>{profile.email || 'Email not found'}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1"><Label>First Name</Label><Input id="firstName" value={profile.firstName || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Last Name</Label><Input id="lastName" value={profile.lastName || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Username</Label><Input id="username" value={profile.username || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input id="phone" value={profile.phone || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Country</Label><Input id="country" value={profile.country || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    
                    <div className="space-y-1">
                        <Label className="flex items-center gap-2 text-primary font-bold"><Wallet className="h-4 w-4" /> Main Balance (₦)</Label>
                        <Input id="nairaBalance" type="number" value={profile.nairaBalance || 0} onChange={handleInputChange} readOnly={!editMode} className={editMode ? "border-primary" : ""} />
                    </div>
                    <div className="space-y-1">
                        <Label className="flex items-center gap-2 text-orange-500 font-bold"><Gift className="h-4 w-4" /> Reward Balance</Label>
                        <Input id="rewardBalance" type="number" value={profile.rewardBalance || 0} onChange={handleInputChange} readOnly={!editMode} className={editMode ? "border-orange-500" : ""} />
                    </div>
                    <div className="space-y-1">
                        <Label className="flex items-center gap-2 text-blue-500 font-bold"><MousePointer2 className="h-4 w-4" /> Click Count</Label>
                        <Input id="clickCount" type="number" value={profile.clickCount || 0} onChange={handleInputChange} readOnly={!editMode} className={editMode ? "border-blue-500" : ""} />
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Bank Name</Label>
                        <Input value={profile.bankName || 'Account Not Generated'} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-1">
                        <Label>Virtual Account Number</Label>
                        <Input value={profile.accountNumber || 'Account Not Generated'} readOnly className="bg-muted font-mono font-bold" />
                    </div>
                    <div className="space-y-1">
                        <Label>BVN / NIN</Label>
                        <Input value={profile.bvn || 'Not Provided'} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-1">
                        <Label>Transaction PIN</Label>
                        <div className="flex items-center gap-2 font-mono text-lg p-2 bg-muted rounded-md h-10 border">
                            <KeyRound className="h-5 w-5 text-muted-foreground" />
                            <span className="font-bold text-primary">{profile.pin || 'None'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>User Ledger (Recent Transactions)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Details</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? transactions.map(tx => (
                                <TableRow key={tx.$id}>
                                    <TableCell><div className="font-medium capitalize">{tx.type.replace('_', ' ')}</div><div className="text-sm text-muted-foreground truncate max-w-[150px]">{tx.recipientName || tx.narration}</div></TableCell>
                                    <TableCell>{format(new Date(tx.$createdAt), 'PPp')}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge></TableCell>
                                    <TableCell className={`text-right font-semibold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'deposit' ? '+' : '-'} ₦{tx.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No transaction history recorded for this user.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
