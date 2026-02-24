'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveAccountNumber, getBankList, makeBankTransfer } from '@/app/actions/flutterwave';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';

type Bank = {
    id: number;
    code: string;
    name: string;
};

export default function TransferPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();

    // Step 1 state
    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    
    // Step 2 state
    const [resolvedName, setResolvedName] = useState('');
    const [amount, setAmount] = useState('');
    const [narration, setNarration] = useState('');
    const [pin, setPin] = useState('');

    // Bank list state
    const [banks, setBanks] = useState<Bank[]>([]);
    const [banksLoading, setBanksLoading] = useState(true);

    // Control state
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchBanks = async () => {
            setBanksLoading(true);
            const result = await getBankList();
            if (result.success) {
                // Deduplicate banks by code to prevent React key errors and confusion
                const uniqueBanks = Array.from(new Map(result.data.map((bank: Bank) => [bank.code, bank])).values());
                setBanks(uniqueBanks);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Could Not Load Banks',
                    description: result.message || 'Failed to fetch the list of banks. Please try again later.',
                });
            }
            setBanksLoading(false);
        };

        fetchBanks();
    }, [toast]);

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
            let description = result.message || 'Could not verify the account details. Please check and try again.';
            if (result.message?.toLowerCase().includes('unknown bank code')) {
                description = 'The selected bank is not currently supported or the bank code is incorrect. Please try another bank.';
            }
            toast({
                variant: 'destructive',
                title: 'Account Verification Failed',
                description: description,
            });
        }
    };

    const handleSendMoney = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to make a transfer.' });
            return;
        }

        const selectedBank = banks.find(b => b.code === bankCode);
        if (!selectedBank) {
            toast({ variant: 'destructive', title: 'Error', description: 'A valid bank was not selected.'});
            return;
        }

        setIsLoading(true);

        const result = await makeBankTransfer({
            userId: user.$id,
            pin,
            bankCode,
            accountNumber,
            amount: Number(amount),
            narration,
            recipientName: resolvedName,
            bankName: selectedBank.name
        });

        if (result.success) {
            toast({
                title: 'Transfer Successful',
                description: result.message || `Your transfer to ${resolvedName} was successful.`
            });
            router.push('/dashboard');
        } else {
            toast({
                variant: 'destructive',
                title: 'Transfer Failed',
                description: result.message || 'An unexpected error occurred during the transfer.'
            });
        }

        setIsLoading(false);
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
                            <p className="text-sm text-muted-foreground">{accountNumber} - {banks.find(b => b.code === bankCode)?.name}</p>
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
                            <Input id="pin" type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} required/>
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
                         <Select onValueChange={setBankCode} value={bankCode} disabled={banksLoading}>
                            <SelectTrigger id="bank">
                                <SelectValue placeholder={banksLoading ? "Loading banks..." : "Select a bank"} />
                            </SelectTrigger>
                            <SelectContent>
                                {banks.map((b) => (
                                <SelectItem key={b.code} value={b.code}>
                                    {b.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleVerifyDetails} className="w-full" disabled={isLoading || accountNumber.length !== 10 || !bankCode || banksLoading}>
                        {isLoading ? 'Verifying...' : 'Continue'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
