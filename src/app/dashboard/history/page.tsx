'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const transactionsQuery = useMemo(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'));
    }, [user, firestore]);

    const { data: transactions, loading } = useCollection(transactionsQuery);

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    const getAmountClass = (amount: number) => {
        return amount > 0 ? 'text-green-500' : 'text-red-500';
    };
    
    const formatAmount = (amount: number) => {
        if (typeof amount !== 'number') return '₦0.00';
        const sign = amount > 0 ? '+' : '-';
        const absoluteAmount = Math.abs(amount);
        return `${sign} ₦${absoluteAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>A record of your recent transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction</TableHead>
                                <TableHead className="hidden md:table-cell">Type</TableHead>
                                <TableHead className="hidden md:table-cell">Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                Array.from({ length: 3 }).map((_, i) => (
                                     <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            )}
                            {!loading && transactions && transactions.length > 0 ? transactions.map((tx: any) => (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className="font-medium">{tx.recipientName}</div>
                                        <div className="text-xs text-muted-foreground hidden md:block">{tx.sessionId}</div>
                                    </TableCell>
                                     <TableCell className="hidden md:table-cell">
                                        <Badge variant={getStatusVariant(tx.status)} className="capitalize">{tx.type?.replace('_', ' ')}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{tx.createdAt?.toDate().toLocaleDateString()}</TableCell>
                                    <TableCell className={`text-right font-medium ${getAmountClass(tx.amount)}`}>{formatAmount(tx.amount)}</TableCell>
                                </TableRow>
                            )) : !loading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No transactions yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
