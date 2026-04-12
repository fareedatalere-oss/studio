'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { initializeDeposit } from '@/app/actions/paystack';

/**
 * @fileOverview Wallet Funding Page.
 * LOGIC: Initializes a secure deposit session via Paystack.
 * SECURITY: Requires authentication and a minimum deposit amount.
 */

export default function DepositPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();

    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInitializeDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please sign in to fund your account.' });
            return;
        }

        const depositAmount = Number(amount);
        if (isNaN(depositAmount) || depositAmount < 100) {
            toast({ 
                variant: 'destructive', 
                title: 'Invalid Amount', 
                description: 'The minimum deposit amount is ₦100.00' 
            });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Initializing Secure Payment...', description: 'Redirecting to Paystack checkout.' });

        try {
            const result = await initializeDeposit({
                email: user.email,
                userId: user.$id,
                amount: depositAmount
            });

            if (result.success && result.data.authorization_url) {
                // Redirect user to the Paystack payment page
                window.location.href = result.data.authorization_url;
            } else {
                throw new Error(result.message || 'Gateway connection failed. Please try again.');
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Payment Error', 
                description: error.message 
            });
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
                        <CreditCard className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Fund Wallet</CardTitle>
                    <CardDescription className="font-bold text-xs opacity-70">
                        Add funds securely via Bank or Card
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-10">
                    <form onSubmit={handleInitializeDeposit} className="space-y-8">
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
                            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Initialize Payment'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 py-8 bg-muted/30 border-t border-dashed">
                    <p className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-widest leading-relaxed">
                        Securely processed by Paystack <br/>Approved by I-Pay Security Engine
                    </p>
                    <div className="flex items-center justify-center gap-2 opacity-30">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[8px] font-black uppercase tracking-widest">End-to-End Encrypted</p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}