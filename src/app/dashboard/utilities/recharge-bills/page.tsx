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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Provider = {
    biller_code: string;
    name: string;
};

export default function RechargeBillsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [electricityProviders, setElectricityProviders] = useState<Provider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    const [discoCode, setDiscoCode] = useState('');
    const [meterNumber, setMeterNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [meterType, setMeterType] = useState('prepaid');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchProviders() {
            setProvidersLoading(true);
            const result = await getUtilityProviders('electricity');
            if (result.success) {
                const uniqueProviders = Array.from(new Map(result.data.map((item: Provider) => [item.biller_code, item])).values());
                setElectricityProviders(uniqueProviders);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load electricity providers.',
                });
            }
            setProvidersLoading(false);
        }
        fetchProviders();
    }, [toast]);


    const selectedDisco = electricityProviders.find(p => p.biller_code === discoCode);

    const handlePurchase = async () => {
        if (!user || !selectedDisco) return;
        setIsLoading(true);

        const result = await makeBillPayment({
            userId: user.$id,
            pin,
            billerCode: selectedDisco.biller_code,
            customer: meterNumber,
            amount: Number(amount),
            type: 'electricity',
            narration: `${selectedDisco.name} ${meterType} payment`,
        });

        setIsLoading(false);

        if (result.success) {
            toast({
                title: "Payment Successful",
                description: result.message,
            });
            router.push('/dashboard');
        } else {
            toast({
                variant: 'destructive',
                title: "Payment Failed",
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
                    <CardTitle>Recharge Bills</CardTitle>
                    <CardDescription>Pay for your electricity bills.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="disco">Distribution Company (Disco)</Label>
                        <Select onValueChange={setDiscoCode} value={discoCode} disabled={providersLoading}>
                            <SelectTrigger id="disco">
                                <SelectValue placeholder={providersLoading ? "Loading Discos..." : "Select your Disco"} />
                            </SelectTrigger>
                            <SelectContent>
                                {electricityProviders.map(p => (
                                    <SelectItem key={p.biller_code} value={p.biller_code}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Meter Type</Label>
                        <RadioGroup value={meterType} onValueChange={setMeterType} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="prepaid" id="prepaid" /><Label htmlFor="prepaid">Prepaid</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="postpaid" id="postpaid" /><Label htmlFor="postpaid">Postpaid</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="meterNumber">Meter Number</Label>
                        <Input id="meterNumber" value={meterNumber} onChange={e => setMeterNumber(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₦)</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!selectedDisco || !meterNumber || !amount}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to pay ₦{Number(amount).toLocaleString()} for {selectedDisco?.name} on meter {meterNumber}. Enter your PIN to confirm.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                                <Input id="pin" type="tel" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} />
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
