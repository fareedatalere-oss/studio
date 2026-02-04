'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nigerianBanks } from '@/lib/nigerian-banks';
import { resolveAccountNumber } from '@/app/actions/flutterwave';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function TransferPage() {
    const { toast } = useToast();
    const router = useRouter();

    // Step 1 state
    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    
    // Step 2 state
    const [resolvedName, setResolvedName] = useState('');
    const [amount, setAmount] = useState('');
    const [narration, setNarration] = useState('');
    const [pin, setPin] = useState('');

    // Control state
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d{0,10}$/.test(value)) {
            setAccountNumber(value);
        }
    };
    
    const handleVerifyDetails = async () => {
        setIsLoading(true);
        const result = await resolveAccountNumber({ accountNumber, bankCode });
        setIsLoading(false);

        if (result.success && result.data?.account_name) {
            setResolvedName(result.data.account_name);
            setStep(2);
        } else {
            toast({
                variant: 'destructive',
                title: 'Account Verification Failed',
                description: result.message || 'Could not verify the account details. Please check and try again.',
            });
        }
    };

    const handleSendMoney = () => {
        setIsLoading(true);
        // This is where the actual transfer API call will go.
        // For now, I'll just simulate it and prepare for transaction history.
        console.log("Sending money:", { accountNumber, bankCode, amount, narration, resolvedName });
        setTimeout(() => {
            toast({
                title: 'Transfer Successful (Simulated)',
                description: `₦${amount} sent to ${resolvedName}. This is a simulation and no real money was sent.`
            });
             // In the next step, I will save this to the database.
            setIsLoading(false);
            router.push('/dashboard');
        }, 2000);
    };

    if (step === 2) {
        return (
             <div className="container py-8">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader className='relative'>
                        <Button variant="ghost" size="icon" className="absolute left-2 top-2" onClick={() => setStep(1)}><ArrowLeft/></Button>
                        <CardTitle className="text-center pt-8">Confirm Transfer</CardTitle>
                        <CardDescription className="text-center">You are sending money to:</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center bg-muted p-4 rounded-md">
                            <p className="font-bold text-lg">{resolvedName}</p>
                            <p className="text-sm text-muted-foreground">{accountNumber} - {nigerianBanks.find(b => b.code === bankCode)?.name}</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₦)</Label>
                            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 5000" required/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="narration">Narration (Optional)</Label>
                            <Input id="narration" value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g., For groceries" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="pin">Your 5-Digit PIN</Label>
                            <Input id="pin" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))} maxLength={5} required/>
                        </div>

                        <Button onClick={handleSendMoney} className="w-full" disabled={isLoading || !amount || pin.length !== 5}>
                            {isLoading ? 'Sending...' : `Send ₦${Number(amount).toLocaleString() || '0'}`}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Send Money</CardTitle>
                    <CardDescription>Enter recipient details to start a transfer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="accountNumber">Recipient Account Number</Label>
                        <Input 
                            id="accountNumber" 
                            value={accountNumber}
                            onChange={handleAccountChange}
                            placeholder="0123456789"
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bank">Destination Bank</Label>
                         <Select onValueChange={setBankCode} value={bankCode}>
                            <SelectTrigger id="bank">
                                <SelectValue placeholder="Select a bank" />
                            </SelectTrigger>
                            <SelectContent>
                                {nigerianBanks.map((b) => (
                                <SelectItem key={b.code} value={b.code}>
                                    {b.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleVerifyDetails} className="w-full" disabled={isLoading || accountNumber.length !== 10 || !bankCode}>
                        {isLoading ? 'Verifying...' : 'Continue'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
