'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2, CheckCircle2, XCircle, Share2, Printer } from 'lucide-react';
import Link from 'next/link';
import { databases, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { format } from 'date-fns';
import { IPayLogo } from '@/components/icons';
import { cn } from '@/lib/utils';

export default function ReceiptPage() {
    const params = useParams();
    const router = useRouter();
    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const id = params.id as string;

    const fetchTransaction = useCallback(async () => {
        try {
            const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, id);
            setTransaction(doc);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchTransaction();
    }, [id, fetchTransaction]);

    const handleDownload = () => {
        window.print();
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    if (!transaction) {
        return (
            <div className="container py-20 text-center">
                <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Receipt Not Found</h1>
                <Button asChild className="mt-6"><Link href="/dashboard">Back to Home</Link></Button>
            </div>
        );
    }

    const isSuccess = transaction.status === 'completed';

    return (
        <div className="container py-8 max-w-lg print:p-0 print:max-w-none">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Button onClick={() => router.back()} variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleDownload} variant="outline" size="sm">
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button onClick={handleDownload} size="sm">
                        <Download className="mr-2 h-4 w-4" /> Save Receipt
                    </Button>
                </div>
            </div>

            <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white text-black">
                <CardHeader className="text-center bg-muted/30 pt-10 pb-8 relative">
                    <div className="mx-auto mb-4">
                        <IPayLogo width={60} height={60} />
                    </div>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Transaction Receipt</CardTitle>
                    <div className={cn(
                        "mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                        isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                        {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {transaction.status}
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Amount Sent</p>
                        <h2 className="text-4xl font-black tracking-tighter">₦{Number(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</h2>
                    </div>

                    <div className="space-y-4 border-t border-dashed pt-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Purpose</span>
                            <span className="font-black text-right capitalize">{transaction.type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Description</span>
                            <span className="font-black text-right">{transaction.recipientName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Recipient</span>
                            <span className="font-black text-right">{transaction.recipientDetails}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Transaction ID</span>
                            <span className="font-mono text-[10px] font-bold text-right uppercase">{transaction.$id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Date & Time</span>
                            <span className="font-black text-right">{format(new Date(transaction.$createdAt), 'PPpp')}</span>
                        </div>
                    </div>

                    <div className="bg-muted/20 p-4 rounded-2xl border border-dashed">
                        <p className="text-[9px] font-bold text-muted-foreground text-center leading-relaxed">
                            {transaction.narration || "Official I-Pay Digital Transaction Record"}
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="bg-primary p-6 text-center text-white">
                    <p className="w-full text-[10px] font-black uppercase tracking-[0.2em]">Generated by I-Pay Security Engine</p>
                </CardFooter>
            </Card>

            <div className="mt-10 text-center print:hidden">
                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Thank you for using I-Pay Online Business & Transactions</p>
            </div>
        </div>
    );
}
