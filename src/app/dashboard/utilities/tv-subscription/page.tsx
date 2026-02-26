
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
import { getPaystackProviders, getUtilityPlansPaystack, initiatePaystackTransfer } from '@/app/actions/paystack';

export default function TvSubscriptionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [providers, setProviders] = useState<any[]>([]);
    const [providersLoading, setProvidersLoading] = useState(true);
    
    const [plans, setPlans] = useState<any[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [planSearch, setPlanSearch] = useState('');

    const [providerCode, setProviderCode] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getPaystackProviders().then(res => {
            if (res.success) {
                const tv = res.data.filter((b: any) => 
                    b.name.toUpperCase().includes('DSTV') || 
                    b.name.toUpperCase().includes('GOTV') || 
                    b.name.toUpperCase().includes('STARTIMES') || 
                    b.name.toUpperCase().includes('SHOWMAX')
                ).map((b: any) => {
                    let cleanName = b.name;
                    if (cleanName.toUpperCase().includes('DSTV')) cleanName = 'DStv';
                    if (cleanName.toUpperCase().includes('GOTV')) cleanName = 'GOtv';
                    if (cleanName.toUpperCase().includes('STARTIMES')) cleanName = 'StarTimes';
                    return { ...b, name: cleanName };
                });
                setProviders(tv);
            }
            setProvidersLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!providerCode) return;
        const provider = providers.find(p => p.code === providerCode);
        if (!provider) return;

        setPlansLoading(true);
        setSelectedPlan(null);
        getUtilityPlansPaystack(provider.name).then(res => {
            if (res.success) setPlans(res.data);
            setPlansLoading(false);
        });
    }, [providerCode, providers]);

    const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()));

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !providerCode) return;
        setIsLoading(true);

        const provider = providers.find(p => p.code === providerCode);
        const result = await initiatePaystackTransfer({
            userId: user.$id,
            pin,
            bankCode: providerCode,
            accountNumber: cardNumber,
            name: `${provider?.name} Sub: ${selectedPlan.name}`,
            amount: selectedPlan.amount,
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
                    <CardDescription>Renew your cable subscription instantly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select onValueChange={setProviderCode} value={providerCode} disabled={providersLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={providersLoading ? "Loading providers..." : "Select provider"} />
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

                    {providerCode && (
                        <div className="space-y-2 pt-2 border-t">
                            <Label>Choose Package</Label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search packages..." className="pl-9 h-9 text-sm" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {plansLoading ? <Loader2 className="animate-spin mx-auto mt-4" /> : filteredPlans.length > 0 ? filteredPlans.map(plan => (
                                    <Button 
                                        key={plan.id} 
                                        variant={selectedPlan?.id === plan.id ? 'default' : 'outline'} 
                                        className="justify-between h-12 text-sm" 
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        <span className="truncate flex-1 text-left">{plan.name}</span>
                                        <span className="font-bold ml-2">₦{plan.amount.toLocaleString()}</span>
                                    </Button>
                                )) : <p className="text-center text-xs text-muted-foreground py-4">No matching packages found.</p>}
                            </div>
                        </div>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={!selectedPlan || !cardNumber}>Continue</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Renewal</AlertDialogTitle>
                                <AlertDialogDescription>Pay ₦{selectedPlan?.amount.toLocaleString()} for {selectedPlan?.name} on card {cardNumber}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label>Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center text-lg tracking-widest" />
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
