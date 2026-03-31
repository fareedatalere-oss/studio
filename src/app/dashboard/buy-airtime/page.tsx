'use client';

import { useState } from 'react';
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
import { processDatahouseRecharge } from '@/app/actions/datahouse';

const CORE_PROVIDERS = [
    { name: 'MTN' },
    { name: 'Airtel' },
    { name: 'Glo' },
    { name: '9mobile' }
];

export default function BuyAirtimePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [networkName, setNetworkName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchase = async () => {
        if (!user || !networkName) return;
        
        setIsPurchasing(true);

        const result = await processDatahouseRecharge({
            userId: user.$id,
            pin,
            type: 'airtime',
            providerId: networkName,
            customer: phoneNumber,
            amount: Number(amount),
            fee: 3, 
            description: `${networkName} Airtime`
        });

        if (result.success) {
            toast({ title: "Airtime Purchase Successful" });
            router.push(`/dashboard/receipt/${result.transactionId}`);
        } else {
            toast({ variant: 'destructive', title: "Purchase Failed", description: result.message });
            setIsPurchasing(false);
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-medium hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto shadow-lg border-t-4 border-t-primary">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Buy Airtime</CardTitle>
                    <CardDescription>Instant recharge via Datahouse</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-muted-foreground">Select Provider</Label>
                        <Select onValueChange={setNetworkName} value={networkName}>
                            <SelectTrigger className="h-12 text-lg font-semibold">
                                <SelectValue placeholder="Choose Provider" />
                            </SelectTrigger>
                            <SelectContent>
                                {CORE_PROVIDERS.map(p => (
                                    <SelectItem key={p.name} value={p.name} className="font-bold">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-muted-foreground">Phone Number</Label>
                        <Input 
                            type="tel"
                            inputMode="numeric"
                            value={phoneNumber} 
                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                            maxLength={11} 
                            placeholder="08012345678" 
                            className="h-12 text-xl tracking-wider font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-muted-foreground">Amount (₦)</Label>
                        <Input 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            placeholder="0.00" 
                            className="h-12 text-xl font-bold"
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-14 text-lg font-bold" disabled={!networkName || phoneNumber.length !== 11 || !amount || Number(amount) < 50 || isPurchasing}>
                                {isPurchasing ? <Loader2 className="animate-spin" /> : 'Continue'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                <div className="space-y-2 text-foreground text-sm">
                                    <p>Network: <span className="font-bold">{networkName}</span></p>
                                    <p>Number: <span className="font-bold">{phoneNumber}</span></p>
                                    <div className="pt-2 text-primary font-bold text-lg border-t">Total: ₦{Number(amount).toLocaleString()}</div>
                                </div>
                            </AlertDialogHeader>
                            <div className="space-y-2 pt-4">
                                <Label className="font-bold">Enter 5-Digit Transaction PIN</Label>
                                <Input 
                                    type="password" 
                                    inputMode="numeric"
                                    value={pin} 
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} 
                                    maxLength={5} 
                                    placeholder="*****" 
                                    className="text-center text-2xl tracking-[1rem] h-14" 
                                />
                            </div>
                            <AlertDialogFooter className="pt-4">
                                <AlertDialogCancel disabled={isPurchasing}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isPurchasing || pin.length !== 5} className="font-bold">
                                    {isPurchasing ? <Loader2 className="animate-spin" /> : 'Confirm & Recharge'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
