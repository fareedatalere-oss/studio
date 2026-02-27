'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Landmark, Wallet, TrendingUp, History, User, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function AdminWalletPage() {
    const [stats, setStats] = useState({
        totalCommission: 0,
        marketCommission: 0,
        transferFees: 0,
        subFees: 0
    });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            // Fetch all commission-bearing transactions
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

            // Calculate Subscriptions (Fixed 25k per user)
            const subTotal = profileRes.total * 25000;

            setStats({
                totalCommission: market + transfer + subTotal,
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
    };

    useEffect(() => {
        fetchWalletData();
        const interval = setInterval(fetchWalletData, 10000);
        return () => clearInterval(interval);
    }, []);

    const StatCard = ({ label, value, icon: Icon, color }: any) => (
        <Card className="shadow-lg border-l-4" style={{ borderColor: color }}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">{label}</p>
                        <p className="text-2xl font-black mt-1">₦{value.toLocaleString()}</p>
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
                <StatCard label="Total Revenue" value={stats.totalCommission} icon={Wallet} color="#0284c7" />
                <StatCard label="Market Profit" value={stats.marketCommission} icon={TrendingUp} color="#16a34a" />
                <StatCard label="Transfer Fees" value={stats.transferFees} icon={Landmark} color="#9333ea" />
                <StatCard label="Subscriptions" value={stats.subFees} icon={TrendingUp} color="#ea580c" />
            </div>

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="text-primary" /> Commission Logs
                    </CardTitle>
                    <CardDescription>Real-time breakdown of admin earnings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Clock className="h-4 w-4" /></TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead className="text-right">Admin Profit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? history.map((log, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-[10px] font-mono">
                                        {format(new Date(log.$createdAt), 'HH:mm:ss')}
                                        <br />
                                        {format(new Date(log.$createdAt), 'PP')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-xs uppercase">{log.type.replace('_', ' ')}</div>
                                        <div className="text-[10px] text-muted-foreground">{log.recipientName}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-[10px]">{log.userId.substring(0, 10)}...</TableCell>
                                    <TableCell className="text-right font-black text-green-600">
                                        +₦{log.adminComm.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No commission data found yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}