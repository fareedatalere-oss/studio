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
import { makeBillPayment, getUtilityProviders, getUtilityPlans } from '@/app/actions/flutterwave';

type Provider = {
    biller_code: string;
    name: string;
};

type Plan = {
    item_code: string;
    name: string;
    amount: number;
};

export default function BuyDataPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [dataProviders, setDataProviders] = useState<Provider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);

    const [networkCode, setNetworkCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [planCode, setPlanCode] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchProviders() {
            setProvidersLoading(true);
            const result = await getUtilityProviders('data');
            if (result.success) {
                const uniqueProviders = Array.from(new Map(result.data.map((item: Provider) => [item.biller_code, item])).values());
                setDataProviders(uniqueProviders);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load data providers. Please try again later.',
                });
            }
            setProvidersLoading(false);
        }
        fetchProviders();
    }, [toast]);

    useEffect(() => {
        if (!networkCode) {
            setPlans([]);
            return;
        }

        async function fetchPlans() {
            setPlansLoading(true);
            setPlanCode(''); 
            const result = await getUtilityPlans(networkCode);
            if (result.success) {
                setPlans(result.data.filter((plan: Plan) => plan.amount > 0));
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load data plans for this network.',
                });
                setPlans([]);
            }
            setPlansLoading(false);
        }
        fetchPlans();
    }, [networkCode, toast]);


    const selectedNetwork = dataProviders.find(p => p.biller_code === networkCode);
    const selectedPlan = plans.find(p => p.item_code === planCode);

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !selectedNetwork) return;
        setIsLoading(true);

        const result = await makeBillPayment({
            userId: user.$id,
            pin,
            billerCode: selectedPlan.item_code,
            customer: phoneNumber,
            amount: selectedPlan.amount,
            type: 'data',
            narration: `${selectedNetwork.name} ${selectedPlan.name}`,
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
                    <CardTitle>Buy Data</CardTitle>
                    <CardDescription>Get internet data bundles instantly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="network">Network</Label>
                        <Select onValueChange={setNetworkCode} value={networkCode} disabled={providersLoading}>
                            <SelectTrigger id="network">
                                <SelectValue placeholder={providersLoading ? "Loading networks..." : "Select a network"} />
                            </SelectTrigger>
                            <SelectContent>
                                {dataProviders.map(p => (
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
                    {networkCode && (
                        <div className="space-y-2">
                            <Label htmlFor="plan">Data Plan</Label>
                            <Select onValueChange={setPlanCode} value={planCode} disabled={plansLoading}>
                                <SelectTrigger id="plan">
                                    <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a data plan"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map(plan => (
                                        <SelectItem key={plan.item_code} value={plan.item_code}>
                                            {plan.name} - ₦{plan.amount.toLocaleString()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!selectedPlan || phoneNumber.length < 10}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to buy {selectedPlan?.name} for {phoneNumber}. The sum of ₦{selectedPlan?.amount.toLocaleString()} will be deducted. Enter your PIN to confirm.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                                <Input id="pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={5} />
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
