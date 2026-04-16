
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight, XCircle, ShieldAlert } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, Query } from "@/lib/data-service";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";

/**
 * @fileOverview User Transaction History.
 * SHIELDED: Forced In-Memory sorting to bypass missing indexes and open instantly.
 * FIXED: Hydration guard to prevent white-screen crashes during racing.
 */

const safeDate = (val: any) => {
    if (!val) return new Date(0);
    try {
        if (typeof val.toDate === 'function') return val.toDate();
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date(0) : d;
    } catch (e) { return new Date(0); }
};

export default function HistoryPage() {
    const { user, loading: userLoading } = useUser();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const fetchTransactions = useCallback(async () => {
        if (!user?.$id) return;
        setLoading(true);
        setError(null);
        try {
            // Master Force: Fetch and sort client-side to bypass Firebase index errors
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_TRANSACTIONS,
                [
                    Query.equal('userId', user.$id),
                    Query.limit(100)
                ]
            );
            
            const sorted = response.documents.sort((a, b) => {
                return safeDate(b.$createdAt).getTime() - safeDate(a.$createdAt).getTime();
            });

            setTransactions(sorted);
        } catch (err: any) {
            setError("Ledger is updating. Try again in 5 seconds.");
        } finally {
            setLoading(false);
        }
    }, [user?.$id]);

    useEffect(() => {
        setIsMounted(true);
        if (user?.$id) {
            fetchTransactions();
        } else if (!userLoading) {
            setLoading(false);
        }
    }, [user?.$id, userLoading, fetchTransactions]);

    if (!isMounted) return null;

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    const getAmountClass = (type: string) => {
        return type !== 'deposit' && type !== 'product_sale' && type !== 'reward_withdrawal' ? 'text-red-500' : 'text-green-500';
    };
    
    const formatAmount = (amount: number, type: string) => {
        if (typeof amount !== 'number') return '₦0.00';
        const sign = type !== 'deposit' && type !== 'product_sale' && type !== 'reward_withdrawal' ? '-' : '+';
        return `${sign} ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="container py-8 max-w-4xl font-body">
            <Link href="/dashboard" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary transition-all">
                <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
            <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-primary/5 pb-8 pt-10">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
                        <Calendar className="h-7 w-7 text-primary" />
                        Account Ledger
                    </CardTitle>
                    <CardDescription className="font-bold text-xs opacity-70">Official record of all digital asset movements.</CardDescription>
                </CardHeader>
                <CardContent className="pt-10">
                    {error && !loading && transactions.length === 0 ? (
                        <div className="py-16 text-center space-y-4">
                            <ShieldAlert className="h-12 w-12 mx-auto text-orange-500 opacity-50" />
                            <p className="font-bold text-sm max-w-xs mx-auto text-muted-foreground">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchTransactions} className="rounded-full font-black uppercase text-[10px]">Retry Hub</Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="font-black uppercase text-[10px]">Event</TableHead>
                                    <TableHead className="font-black uppercase text-[10px]">Recipient</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px]">Value</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(loading || userLoading) ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-20 rounded-lg" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32 rounded-lg" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 ml-auto rounded-lg" /></TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))
                                ) : transactions.length > 0 ? (
                                    transactions.map((tx: any) => (
                                        <TableRow key={tx.$id} className="hover:bg-muted/30 border-muted/20 h-16">
                                            <TableCell>
                                                <div className="text-[10px] font-black text-foreground uppercase tracking-tighter leading-none">
                                                    {format(safeDate(tx.$createdAt), 'PP')}
                                                </div>
                                                <div className="text-[8px] font-bold text-muted-foreground uppercase mt-1">
                                                    {format(safeDate(tx.$createdAt), 'HH:mm')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-black uppercase text-[10px] tracking-tight text-primary truncate max-w-[120px]">
                                                    {tx.recipientName || tx.type.replace('_', ' ')}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={getStatusVariant(tx.status)} className="text-[7px] font-black uppercase px-1.5 py-0 h-3.5 tracking-tighter">
                                                        {tx.status}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`text-right font-black text-xs ${getAmountClass(tx.type)}`}>
                                                {formatAmount(tx.amount, tx.type)}
                                            </TableCell>
                                            <TableCell>
                                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                    <Link href={`/dashboard/receipt/${tx.$id}`}><ChevronRight className="h-4 w-4" /></Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-40 text-center text-muted-foreground grayscale opacity-20">
                                            <XCircle className="mx-auto h-12 w-12 mb-4" />
                                            <p className="font-black uppercase text-[10px] tracking-widest">No Logs Registered</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
