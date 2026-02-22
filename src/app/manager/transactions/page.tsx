'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

const UserDisplay = ({ userId }: { userId: string }) => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;
        databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId)
            .then(profile => {
                if (isMounted) setUser(profile);
            })
            .catch(() => {
                if (isMounted) setUser({ username: 'Unknown User', avatar: '' });
            });
        return () => { isMounted = false; };
    }, [userId]);

    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.username?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <span>{user?.username || 'Loading...'}</span>
        </div>
    );
};


export default function ManagerTransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_TRANSACTIONS,
            [Query.orderDesc('$createdAt'), Query.limit(100)]
        ).then(response => {
            setTransactions(response.documents);
        }).catch(error => {
            console.error("Failed to fetch transactions:", error);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };
    
    const formatAmount = (amount: number, type: string) => {
        if (typeof amount !== 'number') return '₦0.00';
        const sign = type?.toLowerCase() === 'deposit' ? '+' : '-';
        return `${sign} ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Review all user transactions across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : transactions.length > 0 ? (
                 transactions.map((tx) => (
                    <TableRow key={tx.$id}>
                        <TableCell>
                           <UserDisplay userId={tx.userId} />
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{tx.recipientName || tx.narration}</div>
                            <div className="text-xs text-muted-foreground">{tx.type.replace('_', ' ')}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{format(new Date(tx.$createdAt), 'PPp')}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant={getStatusVariant(tx.status)} className="capitalize">{tx.status}</Badge>
                        </TableCell>
                         <TableCell className={`text-right font-medium ${tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                            {formatAmount(tx.amount, tx.type)}
                        </TableCell>
                    </TableRow>
                 ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
