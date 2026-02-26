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

export default function BuyAirtimePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [providers, setProviders] = useState<any[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    const [networkCode, setNetworkCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getPaystackProviders().then(res => {
            if (res.success) {
                // Strictly filter for real Telcos and clean their names
                const telcos = res.data
                    .filter((b: any) => 
                        (b.name.toUpperCase().includes('MTN') || 
                         b.name.toUpperCase().includes('AIRTEL') || 
                         b.name.toUpperCase().includes('GLO') || 
                         b.name.toUpperCase().includes('9MOBILE')) &&
                        !b.name.toUpperCase().includes('GLOBUS') // Prevent Globus Bank
                    )
                    .map((b: any) => {
                        let cleanName = b.name;
                        if (cleanName.toUpperCase().includes('MTN')) cleanName = 'MTN';
                        if (cleanName.toUpperCase().includes('AIRTEL')) cleanName = 'Airtel';
                        if (cleanName.toUpperCase().includes('GLO')) cleanName = 'Glo';
                        if (cleanName.toUpperCase().includes('9MOBILE')) cleanName = '9mobile';
                        return { ...b, name: cleanName };
                    });
                setProviders(telcos);
            }
            setProvidersLoading(false);
        });
    }, []);

    const selectedProvider = providers.find(p => p.code === networkCode);

    const handlePurchase = async () => {
        if (!user || !selectedProvider) return;
        setIsLoading(true);

        const result = await initiatePaystackTransfer({
            userId: user.$id,
            pin,
            bankCode: selectedProvider.code,
            accountNumber: phoneNumber,
            name: `${selectedProvider.name} Airtime`,
            amount: Number(amount),
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Airtime Sent Successfully" });
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
                    <CardTitle>Buy Airtime</CardTitle>
                    <CardDescription>Select network and enter details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Network</Label>
                        <Select onValueChange={setNetworkCode} value={networkCode} disabled={providersLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={providersLoading ? "Loading networks..." : "Select network"} />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="08012345678" />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!networkCode || phoneNumber.length < 10 || !amount}>Continue</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                <AlertDialogDescription>Buy ₦{amount} airtime for {phoneNumber} ({selectedProvider?.name})?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label>Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm Payment'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
