'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/hooks/use-appwrite";
import { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";

// TODO: Replace with your actual Database and Collection IDs from Appwrite
const DATABASE_ID = 'YOUR_DATABASE_ID';
const COLLECTION_ID_TRANSACTIONS = 'YOUR_COLLECTION_ID_TRANSACTIONS';

export default function HistoryPage() {
    const { user, loading: userLoading } = useUser();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchTransactions = async () => {
                setLoading(true);
                try {
                    const response = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTION_ID_TRANSACTIONS,
                        [
                            Query.equal('userId', user.$id),
                            Query.orderDesc('$createdAt')
                        ]
                    );
                    setTransactions(response.documents);
                } catch (error) {
                    console.error("Failed to fetch transactions:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchTransactions();
        } else if (!userLoading) {
            setLoading(false);
        }
    }, [user, userLoading]);

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    const getAmountClass = (type: string) => {
        return type !== 'deposit' ? 'text-red-500' : 'text-green-500';
    };
    
    const formatAmount = (amount: number, type: string) => {
        if (typeof amount !== 'number') return '₦0.00';
        const sign = type !== 'deposit' ? '-' : '+';
        return `${sign} ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                            {(loading || userLoading) ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                     <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length > 0 ? (
                                transactions.map((tx: any) => (
                                <TableRow key={tx.$id}>
                                    <TableCell>
                                        <div className="font-medium">{tx.recipientName || tx.narration}</div>
                                        <div className="text-xs text-muted-foreground hidden md:block">{tx.sessionId}</div>
                                    </TableCell>
                                     <TableCell className="hidden md:table-cell">
                                        <Badge variant={getStatusVariant(tx.status)} className="capitalize">{tx.type?.replace('_', ' ')}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{new Date(tx.$createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className={`text-right font-medium ${getAmountClass(tx.type)}`}>{formatAmount(tx.amount, tx.type)}</TableCell>
                                </TableRow>
                            ))
                            ) : (
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
