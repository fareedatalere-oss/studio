
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_PROFILES, Query } from '@/lib/data-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Search, Info, Eye, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

const TransactionDetails = ({ tx }: { tx: any }) => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (tx.userId) {
            databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, tx.userId)
                .then(setUser)
                .catch(() => setUser({ username: 'Unknown', email: 'N/A' }));
        }
    }, [tx.userId]);

    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="font-black">{user?.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-black uppercase text-xs">@{user?.username || 'Loading...'}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{user?.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase opacity-40">Financial Impact</p>
                    <div className="p-3 bg-primary/5 rounded-xl">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Balance Change</p>
                        <p className="text-xs font-black">₦{tx.oldBalance?.toLocaleString() || '...'} → ₦{tx.newBalance?.toLocaleString() || '...'}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase opacity-40">Platform Auth</p>
                    <div className="p-3 bg-muted rounded-xl">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Reference ID</p>
                        <p className="text-[9px] font-mono font-bold truncate">{tx.$id}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-[9px] font-black uppercase opacity-40">Service Metadata</p>
                <div className="p-4 border-2 border-dashed rounded-2xl space-y-2">
                    {tx.type === 'electricity' && (
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase">Meter Number</span>
                            <span className="text-sm font-black font-mono text-primary">{tx.recipientDetails}</span>
                        </div>
                    )}
                    {tx.type === 'data' && (
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase">Network/Plan</span>
                            <span className="text-sm font-black text-primary">{tx.recipientName}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase">Amount</span>
                        <span className="text-sm font-black">₦{tx.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase">Status</span>
                        <Badge variant={tx.status === 'completed' ? 'secondary' : 'destructive'} className="text-[8px] font-black uppercase">{tx.status}</Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ManagerTransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setLoading(true);
        databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_TRANSACTIONS,
            [Query.orderDesc('$createdAt'), Query.limit(100)]
        ).then(response => {
            setTransactions(response.documents);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return transactions.filter(tx => 
            tx.$id.toLowerCase().includes(q) || 
            tx.type.toLowerCase().includes(q) || 
            tx.recipientDetails?.toLowerCase().includes(q) ||
            tx.userId?.toLowerCase().includes(q)
        );
    }, [search, transactions]);

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'secondary';
            case 'pending': return 'default';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

  return (
    <div className="container py-8 max-w-6xl">
      <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Master Ledger</CardTitle>
          <CardDescription className="font-bold">Real-time audit of all I-Pay financial activities</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by ID, Account, Meter, or Type..." 
                    className="pl-11 h-12 rounded-2xl bg-muted border-none font-bold text-sm shadow-inner"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

           <Table>
            <TableHeader>
              <TableRow className="border-none">
                <TableHead className="font-black uppercase text-[10px]">Reference / Time</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Service</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Target</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px]">Value</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full rounded-xl" /></TableCell></TableRow>
                ))
              ) : filtered.length > 0 ? (
                 filtered.map((tx) => (
                    <TableRow key={tx.$id} className="border-muted/20 hover:bg-muted/10 h-16">
                        <TableCell>
                            <div className="text-[9px] font-black font-mono uppercase tracking-tighter truncate max-w-[100px]">{tx.$id}</div>
                            <div className="text-[8px] font-bold opacity-50 uppercase mt-1">{format(new Date(tx.$createdAt), 'PPpp')}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-2 border-primary/20 text-primary bg-primary/5">{tx.type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                            <div className="text-[10px] font-bold truncate max-w-[120px]">{tx.recipientName || 'SYSTEM'}</div>
                            <div className="text-[8px] font-mono opacity-50">{tx.recipientDetails || tx.userId?.substring(0, 8)}</div>
                        </TableCell>
                         <TableCell className={cn("text-right font-black text-xs", tx.type === 'deposit' ? 'text-green-600' : 'text-red-600')}>
                            {tx.type === 'deposit' ? '+' : '-'} ₦{tx.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Eye className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                                    <DialogHeader><DialogTitle className="text-center font-black uppercase tracking-widest text-sm">Audit Trace</DialogTitle></DialogHeader>
                                    <TransactionDetails tx={tx} />
                                </DialogContent>
                            </Dialog>
                        </TableCell>
                    </TableRow>
                 ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground opacity-30 font-black uppercase text-xs tracking-widest">No matching records found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
