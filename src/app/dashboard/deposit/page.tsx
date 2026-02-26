
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ArrowDownCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { initializeDeposit } from '@/app/actions/paystack';

export default function DepositPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();

    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const depositAmount = Number(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid deposit amount.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Initializing Deposit...', description: 'Taking you to Paystack for bank transfer.' });

        try {
            const result = await initializeDeposit({
                email: user.email,
                userId: user.$id,
                amount: depositAmount
            });

            if (result.success && result.data.authorization_url) {
                // Redirect directly to the Paystack checkout page
                window.location.href = result.data.authorization_url;
            } else {
                throw new Error(result.message || 'Could not start payment process.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowDownCircle className="text-primary" />
                        Deposit Funds
                    </CardTitle>
                    <CardDescription>
                        Enter the amount you wish to deposit into your account via Paystack bank transfer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleContinue} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₦)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g., 5000"
                                required
                                min="100"
                            />
                            <p className="text-xs text-muted-foreground">Minimum deposit is ₦100.</p>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || !amount}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</> : 'Continue'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4 mt-4">
                    <p className="text-xs text-muted-foreground text-center">
                        Your deposit will be automatically added to your balance once the transfer is confirmed.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
