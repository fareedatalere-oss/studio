'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { getPaystackProviders, initiatePaystackTransfer } from '@/app/actions/paystack';
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
        getPaystackProviders().then(res => {
            if (res.success) {
                const discos = res.data.filter((b: any) => 
                    ['ELECTRIC', 'POWER', 'EDC'].some(t => b.name.toUpperCase().includes(t))
                );
                setProviders(discos.length > 0 ? discos : res.data.slice(0, 10));
            }
            setProvidersLoading(false);
        });
    }, []);

    const selectedDisco = providers.find(p => p.code === discoCode);

    const handlePurchase = async () => {
        if (!user || !selectedDisco) return;
        setIsLoading(true);

        const result = await initiatePaystackTransfer({
            userId: user.$id,
            pin,
            bankCode: selectedDisco.code,
            accountNumber: meterNumber,
            name: `${selectedDisco.name} Bill`,
            amount: Number(amount),
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Bill Paid via Paystack" });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: "Failed", description: result.message });
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard/utilities" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Recharge Bills</CardTitle>
                    <CardDescription>Electricity & Power via Paystack</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Distribution Company (Disco)</Label>
                        <Select onValueChange={setDiscoCode} value={discoCode} disabled={providersLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your Disco" />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
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
                        <Input value={meterNumber} onChange={e => setMeterNumber(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!discoCode || !meterNumber || !amount}>Continue</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Authorize</AlertDialogTitle>
                                <AlertDialogDescription>Pay ₦{amount} for meter {meterNumber} via Paystack?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label>PIN</Label>
                                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} />
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