'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Landmark, Wallet, TrendingUp, History, Clock, Loader2, Trash2, Edit3, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG, Query } from '@/lib/appwrite';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const WALLET_CONFIG_ID = 'wallet_adjustment';

export default function AdminWalletPage() {
    const { toast } = useToast();
    const [stats, setStats] = useState({
        totalCommission: 0,
        marketCommission: 0,
        transferFees: 0,
        subFees: 0
    });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [manualAdjustment, setManualAdjustment] = useState(0);
    const [isEditingBalance, setIsEditingBalance] = useState(false);
    const [newBalanceInput, setNewBalanceInput] = useState('');

    const fetchWalletData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Adjustment
            let adjustment = 0;
            try {
                const config = await databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, WALLET_CONFIG_ID);
                adjustment = Number(config.amount || 0);
                setManualAdjustment(adjustment);
            } catch (e) {}

            // Fetch Transactions
            const txRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                Query.limit(100),
                Query.orderDesc('$createdAt')
            ]);

            const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PROFILES, [
                Query.equal('isMarketplaceSubscribed', true),
                Query.limit(100)
            ]);

            let market = 0;
            let transfer = 0;
            let historyData: any[] = [];

            txRes.documents.forEach(tx => {
                let comm = 0;
                if (tx.type === 'product_purchase') {
                    comm = 80;
                    market += 80;
                } else if (tx.type === 'transfer') {
                    const amt = tx.amount;
                    if (amt >= 100 && amt <= 1000) comm = 30;
                    else if (amt > 1000 && amt < 10000) comm = 80;
                    else if (amt >= 10000 && amt <= 100000) comm = 100;
                    else if (amt > 100000) comm = 150;
                    transfer += comm;
                }

                if (comm > 0) {
                    historyData.push({ ...tx, adminComm: comm });
                }
            });

            const subTotal = profileRes.total * 25000;

            setStats({
                totalCommission: market + transfer + subTotal + adjustment,
                marketCommission: market,
                transferFees: transfer,
                subFees: subTotal
            });
            setHistory(historyData);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWalletData();
        const interval = setInterval(fetchWalletData, 30000);
        return () => clearInterval(interval);
    }, [fetchWalletData]);

    const handleUpdateAdjustment = async () => {
        const val = Number(newBalanceInput);
        if (isNaN(val)) return;
        
        setLoading(true);
        try {
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, WALLET_CONFIG_ID, { amount: val });
            } catch (e: any) {
                if (e.code === 404) {
                    await databases.createDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, WALLET_CONFIG_ID, { amount: val });
                }
            }
            toast({ title: "Balance Updated", description: "The manual adjustment has been saved." });
            setIsEditingBalance(false);
            fetchWalletData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, id);
            toast({ title: "Log Deleted", description: "The transaction has been removed from history." });
            fetchWalletData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Delete Failed", description: error.message });
        }
    };

    const StatCard = ({ label, value, icon: Icon, color, isMain }: any) => (
        <Card className="shadow-lg border-l-4 overflow-hidden" style={{ borderColor: color }}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">{label}</p>
                        {isMain && isEditingBalance ? (
                            <div className="flex items-center gap-2 mt-1">
                                <Input 
                                    type="number" 
                                    value={newBalanceInput} 
                                    onChange={e => setNewBalanceInput(e.target.value)}
                                    className="h-8 w-32 font-black"
                                    placeholder="Adjustment"
                                />
                                <Button size="icon" className="h-8 w-8" onClick={handleUpdateAdjustment}><Check className="h-4 w-4"/></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingBalance(false)}>&times;</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-black">₦{value.toLocaleString()}</p>
                                {isMain && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => { setNewBalanceInput(manualAdjustment.toString()); setIsEditingBalance(true); }}>
                                        <Edit3 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-3 rounded-full bg-muted">
                        <Icon className="h-6 w-6" style={{ color }} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container py-8">
            <div className="flex items-center justify-between mb-8">
                <Button asChild variant="ghost">
                    <Link href="/manager/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span className="text-[10px] font-bold text-muted-foreground">AUTO-REFRESHING</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Revenue (Inc. Adj)" value={stats.totalCommission} icon={Wallet} color="#0284c7" isMain={true} />
                <StatCard label="Market Profit" value={stats.marketCommission} icon={TrendingUp} color="#16a34a" />
                <StatCard label="Transfer Fees" value={stats.transferFees} icon={Landmark} color="#9333ea" />
                <StatCard label="Subscriptions" value={stats.subFees} icon={TrendingUp} color="#ea580c" />
            </div>

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="text-primary" /> Commission Logs
                    </CardTitle>
                    <CardDescription>Real-time breakdown of admin earnings. Delete to clear history.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Clock className="h-4 w-4" /></TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? history.map((log, i) => (
                                <TableRow key={log.$id}>
                                    <TableCell className="text-[10px] font-mono">
                                        {format(new Date(log.$createdAt), 'HH:mm:ss')}
                                        <br />
                                        {format(new Date(log.$createdAt), 'PP')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-xs uppercase">{log.type.replace('_', ' ')}</div>
                                        <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{log.recipientName}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-[10px]">{log.userId.substring(0, 8)}...</TableCell>
                                    <TableCell className="text-right font-black text-green-600">
                                        +₦{log.adminComm.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-30 hover:opacity-100">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Log Entry?</AlertDialogTitle>
                                                    <AlertDialogDescription>This transaction will be removed from your wallet history permanently.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteLog(log.$id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No commission data found yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}