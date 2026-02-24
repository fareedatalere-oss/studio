
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Save, Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
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
    
    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [profileData, transactionsData] = await Promise.all([
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId),
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [Query.equal('userId', userId), Query.orderDesc('$createdAt')])
                ]);
                setProfile(profileData);
                setTransactions(transactionsData.documents);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
                router.push('/manager/users');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, router, toast]);

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, ...updateData } = profile;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, $id, updateData);
            toast({ title: 'Success', description: 'Profile updated successfully.' });
            setEditMode(false);
        } catch (error: any) {
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
        return <div className="container py-8"><Skeleton className="w-full h-[500px]" /></div>;
    }

    if (!profile) {
        return <div className="container py-8 text-center">User not found.</div>;
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
                        Save Changes
                    </Button>
                ) : (
                    <Button onClick={() => setEditMode(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Profile
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
                            <CardTitle>{profile.username}</CardTitle>
                            <CardDescription>{profile.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1"><Label>First Name</Label><Input id="firstName" value={profile.firstName || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Last Name</Label><Input id="lastName" value={profile.lastName || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Username</Label><Input id="username" value={profile.username || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input id="phone" value={profile.phone || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Country</Label><Input id="country" value={profile.country || ''} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Naira Balance</Label><Input id="nairaBalance" type="number" value={profile.nairaBalance || 0} onChange={handleInputChange} readOnly={!editMode} /></div>
                    <div className="space-y-1"><Label>Bank Name</Label><Input value={profile.bankName || 'N/A'} readOnly /></div>
                    <div className="space-y-1"><Label>Account Number</Label><Input value={profile.accountNumber || 'N/A'} readOnly /></div>
                    <div className="space-y-1"><Label>BVN</Label><Input value={profile.bvn || 'N/A'} readOnly /></div>
                    <div className="space-y-1">
                        <Label>Transaction PIN</Label>
                        <div className="flex items-center gap-2 font-mono text-lg p-2 bg-muted rounded-md h-10">
                            <KeyRound className="h-5 w-5" />
                            <span className="font-bold">{profile.pin || 'N/A'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Details</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? transactions.map(tx => (
                                <TableRow key={tx.$id}>
                                    <TableCell><div className="font-medium">{tx.type}</div><div className="text-sm text-muted-foreground">{tx.recipientName}</div></TableCell>
                                    <TableCell>{format(new Date(tx.$createdAt), 'PPp')}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge></TableCell>
                                    <TableCell className="text-right">{tx.type === 'deposit' ? '+' : '-'} ₦{tx.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No transactions found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
