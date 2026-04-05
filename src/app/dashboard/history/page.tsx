'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Calendar, ChevronRight } from "lucide-react";
import { useUser } from "@/hooks/use-appwrite";
import { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, Query } from "@/lib/appwrite";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";


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
        return type !== 'deposit' && type !== 'product_sale' ? 'text-red-500' : 'text-green-500';
    };
    
    const formatAmount = (amount: number, type: string) => {
        if (typeof amount !== 'number') return '₦0.00';
        const sign = type !== 'deposit' && type !== 'product_sale' ? '-' : '+';
        return `${sign} ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-medium hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                        <Calendar className="h-6 w-6 text-primary" />
                        Account History
                    </CardTitle>
                    <CardDescription>Full history of your transactions and account activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Date & Time</TableHead>
                                <TableHead>Activity Details</TableHead>
                                <TableHead className="hidden sm:table-cell text-right">Amount</TableHead>
                                <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(loading || userLoading) ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                     <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><div className="space-y-1"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32" /></div></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length > 0 ? (
                                transactions.map((tx: any) => {
                                    const isMarketTx = tx.type === 'product_purchase' || tx.type === 'product_sale';
                                    const otherUserHandle = tx.recipientDetails?.startsWith('@') ? tx.recipientDetails : null;

                                    return (
                                        <TableRow key={tx.$id} className="hover:bg-muted/50 relative">
                                            <TableCell>
                                                <div className="text-[10px] sm:text-xs font-black text-foreground">
                                                    {format(new Date(tx.$createdAt), 'PP')}
                                                </div>
                                                <div className="text-[9px] text-muted-foreground">
                                                    {format(new Date(tx.$createdAt), 'p')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold capitalize text-sm">{tx.type?.replace('_', ' ')}</div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs text-muted-foreground max-w-[180px] truncate" title={tx.recipientName}>
                                                        {tx.recipientName}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={getStatusVariant(tx.status)} className="capitalize text-[8px] px-1.5 py-0 h-4">{tx.status}</Badge>
                                                        {otherUserHandle && (
                                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{otherUserHandle}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`text-right font-black text-sm hidden sm:table-cell ${getAmountClass(tx.type)}`}>
                                                {formatAmount(tx.amount, tx.type)}
                                            </TableCell>
                                            <TableCell>
                                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                                    <Link href={`/dashboard/receipt/${tx.$id}`}>
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground italic">No transaction records found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}