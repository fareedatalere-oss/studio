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

export default function TvSubscriptionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [providers, setProviders] = useState<any[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    const [providerCode, setProviderCode] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getPaystackProviders().then(res => {
            if (res.success) {
                // Filter specifically for TV billers
                const tv = res.data.filter((b: any) => 
                    ['DSTV', 'GOTV', 'STARTIMES', 'SHOWMAX', 'CABLE', 'TV'].some(t => b.name.toUpperCase().includes(t))
                );
                setProviders(tv);
            }
            setProvidersLoading(false);
        });
    }, []);

    const selectedProvider = providers.find(p => p.code === providerCode);

    const handlePurchase = async () => {
        if (!user || !selectedProvider) return;
        setIsLoading(true);

        const result = await initiatePaystackTransfer({
            userId: user.$id,
            pin,
            bankCode: selectedProvider.code,
            accountNumber: cardNumber,
            name: `${selectedProvider.name} Subscription`,
            amount: Number(amount),
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "TV Subscription Successful" });
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
                    <CardTitle>TV Subscription</CardTitle>
                    <CardDescription>Renew your cable subscription</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select onValueChange={setProviderCode} value={providerCode} disabled={providersLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={providersLoading ? "Loading providers..." : "Select a provider"} />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Smart Card / IUC Number</Label>
                        <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Enter card number" />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!providerCode || !cardNumber || !amount}>Continue</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Renewal</AlertDialogTitle>
                                <AlertDialogDescription>Pay ₦{amount} for {selectedProvider?.name} card {cardNumber}?</AlertDialogDescription>
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
