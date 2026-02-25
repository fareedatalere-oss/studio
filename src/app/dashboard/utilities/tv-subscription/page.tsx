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


export default function TvSubscriptionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [tvProviders, setTvProviders] = useState<Provider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);

    const [providerCode, setProviderCode] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [planCode, setPlanCode] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchProviders() {
            setProvidersLoading(true);
            const result = await getUtilityProviders('tv');
            if (result.success) {
                const uniqueProviders = Array.from(new Map(result.data.map((item: Provider) => [item.biller_code, item])).values());
                setTvProviders(uniqueProviders);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load TV providers.',
                });
            }
            setProvidersLoading(false);
        }
        fetchProviders();
    }, [toast]);
    
    useEffect(() => {
        if (!providerCode) {
            setPlans([]);
            return;
        }
        async function fetchPlans() {
            setPlansLoading(true);
            setPlanCode('');
            const result = await getUtilityPlans(providerCode);
            if (result.success) {
                setPlans(result.data.filter((plan: Plan) => plan.amount > 0));
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load plans for this provider.',
                });
                setPlans([]);
            }
            setPlansLoading(false);
        }
        fetchPlans();
    }, [providerCode, toast]);

    const selectedProvider = tvProviders.find(p => p.biller_code === providerCode);
    const selectedPlan = plans.find(p => p.item_code === planCode);

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !selectedProvider) return;
        setIsLoading(true);

        const result = await makeBillPayment({
            userId: user.$id,
            pin,
            billerCode: selectedPlan.item_code,
            customer: cardNumber,
            amount: selectedPlan.amount,
            type: 'tv_subscription',
            narration: `${selectedProvider.name} ${selectedPlan.name}`,
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
                    <CardTitle>TV Subscription</CardTitle>
                    <CardDescription>Renew your cable TV subscription easily.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Select onValueChange={setProviderCode} value={providerCode} disabled={providersLoading}>
                            <SelectTrigger id="provider">
                                <SelectValue placeholder={providersLoading ? "Loading providers..." : "Select a provider"} />
                            </SelectTrigger>
                            <SelectContent>
                                {tvProviders.map(p => (
                                    <SelectItem key={p.biller_code} value={p.biller_code}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="cardNumber">Smart Card / IUC Number</Label>
                        <Input id="cardNumber" value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
                    </div>
                    {providerCode && (
                        <div className="space-y-2">
                            <Label htmlFor="plan">Package / Plan</Label>
                            <Select onValueChange={setPlanCode} value={planCode} disabled={plansLoading}>
                                <SelectTrigger id="plan">
                                    <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a plan"} />
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
                            <Button className="w-full" disabled={!selectedPlan || !cardNumber}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to pay ₦{selectedPlan?.amount.toLocaleString()} for {selectedPlan?.name} on card {cardNumber}. Enter your PIN to confirm.
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
