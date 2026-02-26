
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { getPaystackBillers, initiatePaystackBillPayment } from '@/app/actions/paystack';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function RechargeBillsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [providers, setProviders] = useState<any[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    const [discoCode, setDiscoCode] = useState('');
    const [meterNumber, setMeterNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [meterType, setMeterType] = useState('prepaid');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getPaystackBillers().then(res => {
            if (res.success) {
                // Dynamic Filter for real Nigerian Electricity Providers from Paystack
                const discos = res.data.filter((b: any) => 
                    ['AEDC', 'EKEDC', 'IKEDC', 'KEDCO', 'JED', 'PHED', 'BEDC', 'IBEDC', 'EEDC', 'KAEDCO', 'YEDC'].some(disco => b.name.toUpperCase().includes(disco)) ||
                    b.name.toUpperCase().includes('ELECTRIC') ||
                    b.name.toUpperCase().includes('POWER')
                );
                setProviders(discos);
            }
            setProvidersLoading(false);
        });
    }, []);

    const selectedDisco = providers.find(p => p.slug === discoCode);

    const handlePurchase = async () => {
        if (!user || !selectedDisco) return;
        setIsLoading(true);

        const result = await initiatePaystackBillPayment({
            userId: user.$id,
            pin,
            customer: meterNumber,
            amount: Number(amount),
            type: discoCode,
            description: `${selectedDisco.name} Bill (${meterType})`
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Electricity Bill Paid Successfully" });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: "Payment Failed", description: result.message });
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard/utilities" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Card className="w-full max-md mx-auto">
                <CardHeader>
                    <CardTitle>Recharge Bills</CardTitle>
                    <CardDescription>Electricity and Power payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Distribution Company (Disco)</Label>
                        <Select onValueChange={setDiscoCode} value={discoCode} disabled={providersLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={providersLoading ? "Loading Discos..." : "Select your Disco"} />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
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
                        <Label>Meter Number</Label>
                        <Input value={meterNumber} onChange={e => setMeterNumber(e.target.value)} placeholder="Enter meter number" />
                    </div>
                     <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!discoCode || !meterNumber || !amount}>Continue</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Authorize Payment</AlertDialogTitle>
                                <AlertDialogDescription>Pay ₦{amount} for {selectedDisco?.name} meter {meterNumber}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label>Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
