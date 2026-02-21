'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { makeBillPayment, getUtilityProviders } from '@/app/actions/flutterwave';

type Provider = {
    biller_code: string;
    name: string;
};

export default function BuyAirtimePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [airtimeProviders, setAirtimeProviders] = useState<Provider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    const [network, setNetwork] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchProviders() {
            setProvidersLoading(true);
            const result = await getUtilityProviders('airtime');
            if (result.success) {
                setAirtimeProviders(result.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load airtime providers. Please try again later.',
                });
            }
            setProvidersLoading(false);
        }
        fetchProviders();
    }, [toast]);


    const selectedProvider = airtimeProviders.find(p => p.biller_code === network);

    const handlePurchase = async () => {
        if (!user || !selectedProvider) return;
        setIsLoading(true);

        const result = await makeBillPayment({
            userId: user.$id,
            pin,
            billerCode: selectedProvider.biller_code,
            customer: phoneNumber,
            amount: Number(amount),
            type: 'airtime',
            narration: `${selectedProvider.name} Airtime`,
        });

        setIsLoading(false);

        if (result.success) {
            toast({
                title: "Purchase Successful",
                description: result.message,
            });
            router.push('/dashboard');
        } else {
            toast({
                variant: 'destructive',
                title: "Purchase Failed",
                description: result.message,
            });
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard/utilities" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Utilities
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Buy Airtime</CardTitle>
                    <CardDescription>Top up any mobile number instantly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="network">Network</Label>
                        <Select onValueChange={setNetwork} value={network} disabled={providersLoading}>
                            <SelectTrigger id="network">
                                <SelectValue placeholder={providersLoading ? "Loading networks..." : "Select a network"} />
                            </SelectTrigger>
                            <SelectContent>
                                {airtimeProviders.map(p => (
                                    <SelectItem key={p.biller_code} value={p.biller_code}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                            id="phone" 
                            type="tel"
                            value={phoneNumber} 
                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                            placeholder="e.g., 08012345678"
                            maxLength={11}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₦)</Label>
                        <Input 
                            id="amount" 
                            type="number"
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            placeholder="e.g., 500"
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!network || phoneNumber.length < 10 || !amount || Number(amount) <= 0}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to buy ₦{Number(amount).toLocaleString()} of {selectedProvider?.name} airtime for {phoneNumber}. Enter your PIN to confirm.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    inputMode="numeric"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    maxLength={5}
                                    placeholder="e.g. 12345"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? 'Processing...' : 'Confirm & Pay'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
