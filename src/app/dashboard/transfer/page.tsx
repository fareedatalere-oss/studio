'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveAccountNumber, getBankList } from '@/app/actions/flutterwave';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

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
                setBanks(result.data);
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

        setIsLoading(true);

        try {
            // 1. Fetch user profile
            const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);

            // 2. Check PIN
            if (userProfile.pin !== pin) {
                throw new Error('Incorrect transaction PIN.');
            }
            
            const transferAmount = Number(amount);
            if (isNaN(transferAmount) || transferAmount <= 0) {
                throw new Error('Invalid transfer amount.');
            }
            
            // 3. Check balance
            if (userProfile.nairaBalance < transferAmount) {
                throw new Error('Insufficient balance to complete this transaction.');
            }

            // 4. Simulate the actual transfer API call. In a real app, this would be an API call to Flutterwave.
            // For this prototype, we'll assume it succeeds.
            const transferSuccessful = true; 

            if (transferSuccessful) {
                // 5. Deduct balance from user profile
                const newNairaBalance = userProfile.nairaBalance - transferAmount;
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID_PROFILES,
                    user.$id,
                    { nairaBalance: newNairaBalance }
                );

                // 6. Save the transaction record
                const transactionData = {
                    userId: user.$id,
                    type: 'transfer',
                    amount: transferAmount,
                    status: 'completed',
                    recipientName: resolvedName,
                    recipientDetails: `${accountNumber} - ${banks.find(b => b.code === bankCode)?.name}`,
                    narration: narration,
                    sessionId: `ipay-tx-${Date.now()}`
                };

                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTION_ID_TRANSACTIONS,
                    ID.unique(),
                    transactionData
                );
                
                toast({
                    title: 'Transfer Successful',
                    description: `₦${transferAmount.toLocaleString()} has been sent to ${resolvedName}.`
                });
                router.push('/dashboard');
            } else {
                // If the simulated transfer failed
                throw new Error('The transfer could not be processed by the bank.');
            }

        } catch (error: any) {
            console.error("Transfer error:", error);
            toast({
                title: 'Transfer Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
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
