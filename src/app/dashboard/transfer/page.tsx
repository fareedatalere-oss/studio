'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nigerianBanks } from '@/lib/nigerian-banks';

export default function TransferPage() {
    const [accountNumber, setAccountNumber] = useState('');
    const [bank, setBank] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d{0,10}$/.test(value)) {
            setAccountNumber(value);
        }
    };
    
    const handleContinue = () => {
        setIsLoading(true);
        console.log("Verifying account:", { accountNumber, bank });
        // Simulate API call to verify account
        setTimeout(() => {
            // Next step would be to show holder name and ask for amount
            alert(`Simulating verification for ${accountNumber} at ${bank}. Next step: Show holder name.`);
            setIsLoading(false);
        }, 1500)
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
                         <Select onValueChange={setBank} value={bank}>
                            <SelectTrigger id="bank">
                                <SelectValue placeholder="Select a bank" />
                            </SelectTrigger>
                            <SelectContent>
                                {nigerianBanks.map((b) => (
                                <SelectItem key={b.code} value={b.name}>
                                    {b.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleContinue} className="w-full" disabled={isLoading || accountNumber.length !== 10 || !bank}>
                        {isLoading ? 'Verifying...' : 'Continue'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
