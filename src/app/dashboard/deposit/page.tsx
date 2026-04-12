'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS, ID } from '@/lib/appwrite';

/**
 * @fileOverview Instant Funding Page.
 * LOGIC: Credits user balance directly to Firestore and logs transaction.
 * REDIRECTION: Removed Paystack/Flutterwave for prototype speed.
 */

export default function DepositPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, profile, recheckUser } = useUser();

    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInstantCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile) return;

        const depositAmount = Number(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid deposit amount.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Processing Instant Credit...', description: 'Syncing with cloud database.' });

        try {
            const currentBalance = Number(profile.nairaBalance || 0);
            const newBalance = currentBalance + depositAmount;

            // 1. Update Profile Balance in Firestore
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                nairaBalance: newBalance
            });

            // 2. Create Professional Transaction Record
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: user.$id,
                type: 'deposit',
                amount: depositAmount,
                status: 'completed',
                recipientName: 'Wallet Top-up',
                recipientDetails: 'Instant Direct Credit',
                narration: `Direct account funding of ₦${depositAmount.toLocaleString()}.`,
                sessionId: `direct-${Date.now()}`,
            });

            // 3. Sync Main User Hook
            await recheckUser();

            toast({
                title: 'Account Funded!',
                description: `₦${depositAmount.toLocaleString()} has been saved to your balance.`,
            });

            // Brief delay for visual confirmation before redirect
            setTimeout(() => {
                router.push('/dashboard');
            }, 1200);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message || 'Could not credit account.' });
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-primary/5 text-center pb-8 pt-10">
                    <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 border-primary/20">
                        <ArrowDownCircle className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Fund Account</CardTitle>
                    <CardDescription className="font-bold text-xs opacity-70">
                        Enter any amount to credit your account instantly
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-10">
                    <form onSubmit={handleInstantCredit} className="space-y-8">
                        <div className="space-y-3">
                            <Label htmlFor="amount" className="font-black uppercase text-[10px] opacity-50 tracking-[0.2em] pl-2">Amount to add (₦)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                className="h-16 text-3xl font-black rounded-3xl bg-muted border-none px-8 shadow-inner text-primary placeholder:text-primary/20"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full h-16 rounded-full font-black uppercase tracking-[0.2em] shadow-xl text-xs active:scale-95 transition-transform" disabled={isLoading || !amount}>
                            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Done</>}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 py-8 bg-muted/30 border-t border-dashed">
                    <p className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-widest leading-relaxed">
                        Funds are credited directly to your <br/>Official I-Pay Naira Balance
                    </p>
                    <div className="flex items-center justify-center gap-2 opacity-30">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[8px] font-black uppercase tracking-widest">Secured by I-Pay Engine</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
