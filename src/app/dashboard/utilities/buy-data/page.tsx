
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

export default function BuyDataPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [providers, setProviders] = useState<any[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);
    
    const [plans, setPlans] = useState<any[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [planSearch, setPlanSearch] = useState('');

    const [networkCode, setNetworkCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getPaystackBillers().then(res => {
            if (res.success) {
                // Filter for real Nigerian Telcos including Glo for Data
                const telcos = res.data.filter((b: any) => 
                    b.name.toUpperCase().includes('MTN') || 
                    b.name.toUpperCase().includes('AIRTEL') || 
                    b.name.toUpperCase().includes('GLO') || 
                    b.name.toUpperCase().includes('9MOBILE')
                );
                setProviders(telcos);
            }
            setProvidersLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!networkCode) return;
        const provider = providers.find(p => p.slug === networkCode);
        if (!provider) return;

        // Paystack Billers often include metadata for items/plans
        if (provider.metadata?.items) {
            const sortedPlans = [...provider.metadata.items].sort((a, b) => a.price - b.price);
            setPlans(sortedPlans);
        } else {
            // Fallback mock plans if biller doesn't have metadata items in this sandbox
            setPlans([
                { name: '1GB (Monthly)', price: 1000, value: '1GB' },
                { name: '2GB (Monthly)', price: 1200, value: '2GB' },
                { name: '5GB (Monthly)', price: 1500, value: '5GB' },
                { name: '10GB (Monthly)', price: 3000, value: '10GB' }
            ]);
        }
    }, [networkCode, providers]);

    const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()));

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !networkCode) return;
        setIsLoading(true);

        const provider = providers.find(p => p.slug === networkCode);
        const result = await initiatePaystackBillPayment({
            userId: user.$id,
            pin,
            customer: phoneNumber,
            amount: selectedPlan.price,
            type: networkCode,
            description: `${provider?.name} Data: ${selectedPlan.name}`
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Data Purchase Successful" });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: "Purchase Failed", description: result.message });
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard/utilities" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Buy Data</CardTitle>
                    <CardDescription>Select network and choose a plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Network</Label>
                        <Select onValueChange={setNetworkCode} value={networkCode} disabled={providersLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={providersLoading ? "Loading networks..." : "Select network"} />
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="08012345678" />
                    </div>

                    {networkCode && (
                        <div className="space-y-2 pt-2 border-t">
                            <Label>Select Data Plan</Label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search plans..." className="pl-9 h-9 text-sm" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {filteredPlans.length > 0 ? filteredPlans.map((plan, idx) => (
                                    <Button 
                                        key={idx} 
                                        variant={selectedPlan === plan ? 'default' : 'outline'} 
                                        className="justify-between h-12 text-sm" 
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        <span>{plan.name}</span>
                                        <span className="font-bold">₦{plan.price.toLocaleString()}</span>
                                    </Button>
                                )) : <p className="text-center text-xs text-muted-foreground py-4">No matching plans found.</p>}
                            </div>
                        </div>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!selectedPlan || phoneNumber.length < 10}>Continue</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                <AlertDialogDescription>Buy {selectedPlan?.name} for {phoneNumber} at ₦{selectedPlan?.price.toLocaleString()}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label>Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center text-lg tracking-widest" />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm & Pay'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
