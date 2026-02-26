'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { resolvePaystackAccount, initiatePaystackTransfer } from '@/app/actions/paystack';

export default function PaystackTestPage() {
    const { toast } = useToast();
    const router = useRouter();

    const [accountNumber, setAccountNumber] = useState('');
    const [resolvedName, setResolvedName] = useState('');
    const [pin, setPin] = useState('');
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const ACCESS_BANK_CODE = '044';

    const handleResolve = async () => {
        if (accountNumber.length !== 10) {
            toast({ variant: 'destructive', title: 'Invalid Account', description: 'Enter a 10-digit Access Bank account number.' });
            return;
        }
        setIsLoading(true);
        const result = await resolvePaystackAccount(accountNumber, ACCESS_BANK_CODE);
        setIsLoading(false);

        if (result.success) {
            setResolvedName(result.data.account_name);
            setStep(2);
        } else {
            toast({ variant: 'destructive', title: 'Verification Failed', description: result.message });
        }
    };

    const handleSend = async () => {
        if (!pin) {
            toast({ variant: 'destructive', title: 'PIN Required', description: 'Please enter your transaction PIN.' });
            return;
        }
        setIsLoading(true);
        const result = await initiatePaystackTransfer({
            accountNumber,
            bankCode: ACCESS_BANK_CODE,
            name: resolvedName,
            amount: 300
        });
        setIsLoading(false);

        if (result.success) {
            toast({ title: 'Success!', description: '₦300 has been sent via Paystack.' });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: 'Transfer Failed', description: result.message });
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
                        <CreditCard className="text-primary" />
                        Paystack Payout
                    </CardTitle>
                    <CardDescription>Send ₦300 to any Access Bank account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="account">Access Bank Account Number</Label>
                                <Input 
                                    id="account" 
                                    value={accountNumber} 
                                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} 
                                    placeholder="0123456789" 
                                    maxLength={10}
                                />
                            </div>
                            <Button onClick={handleResolve} className="w-full" disabled={isLoading || accountNumber.length !== 10}>
                                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                Verify Account
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-muted p-4 rounded-md text-center">
                                <p className="font-bold text-lg">{resolvedName}</p>
                                <p className="text-sm text-muted-foreground">Access Bank • {accountNumber}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pin">Transaction PIN</Label>
                                <Input 
                                    id="pin" 
                                    type="password" 
                                    value={pin} 
                                    onChange={e => setPin(e.target.value)} 
                                    placeholder="*****" 
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
                                <Button className="flex-1" onClick={handleSend} disabled={isLoading || !pin}>
                                    {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                    Send ₦300
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}