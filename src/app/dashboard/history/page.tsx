'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Mock data for prototype
const transactions = [
    {
        sessionId: 'TRN-20240731-1A3B4C',
        time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        amount: '- ₦2,500.00',
        recipient: 'MTN Airtime',
        type: 'Utilities',
        status: 'Completed'
    },
    {
        sessionId: 'TRN-20240730-D5E6F7',
        time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        amount: '- ₦15,000.00',
        recipient: 'UBA - 0123456789',
        type: 'Transfer',
        status: 'Completed'
    },
    {
        sessionId: 'TRN-20240729-G8H9I0',
        time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        amount: '+ ₦500.00',
        recipient: 'Welcome Bonus',
        type: 'Deposit',
        status: 'Completed'
    },
    {
        sessionId: 'TRN-20240728-J1K2L3',
        time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        amount: '- ₦1,200.00',
        recipient: 'DSTV Subscription',
        type: 'Utilities',
        status: 'Failed'
    }
];


export default function HistoryPage() {
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
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <TableRow key={tx.sessionId}>
                                    <TableCell>
                                        <div className="font-medium">{tx.recipient}</div>
                                        <div className="text-xs text-muted-foreground hidden md:block">{tx.sessionId}</div>
                                    </TableCell>
                                     <TableCell className="hidden md:table-cell">
                                        <Badge variant={tx.status === 'Failed' ? 'destructive' : 'secondary'} className="capitalize">{tx.type}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{new Date(tx.time).toLocaleDateString()}</TableCell>
                                    <TableCell className={`text-right font-medium ${tx.amount.startsWith('+') ? 'text-green-500' : ''}`}>{tx.amount}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No transactions yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
