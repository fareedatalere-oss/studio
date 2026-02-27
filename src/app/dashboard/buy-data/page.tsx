
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
import { getFlutterwaveDataPlans, initiateFlutterwaveBill } from '@/app/actions/flutterwave';

const CORE_PROVIDERS = [
    { name: 'MTN', searchKey: 'MTN' },
    { name: 'Airtel', searchKey: 'AIRTEL' },
    { name: 'Glo', searchKey: 'GLO' },
    { name: '9mobile', searchKey: '9MOBILE' }
];

export default function BuyDataPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [plans, setPlans] = useState<any[]>([]);
    const [planSearch, setPlanSearch] = useState('');
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);

    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        if (!selectedNetwork) {
            setPlans([]);
            return;
        }

        const fetchPlans = async () => {
            setIsLoadingPlans(true);
            const result = await getFlutterwaveDataPlans(selectedNetwork);
            if (result.success) {
                setPlans(result.data);
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.message });
            }
            setIsLoadingPlans(false);
        };
        fetchPlans();
        setSelectedPlan(null);
    }, [selectedNetwork, toast]);

    const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()));

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !selectedNetwork) return;
        
        setIsPurchasing(true);

        const result = await initiateFlutterwaveBill({
            userId: user.$id,
            pin,
            customer: phoneNumber,
            amount: selectedPlan.price,
            type: selectedNetwork,
            billerCode: selectedPlan.biller_code,
            itemCode: selectedPlan.item_code,
            isData: true
        });

        setIsPurchasing(false);

        if (result.success) {
            toast({ title: "Data Purchase Successful" });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: "Purchase Failed", description: result.message });
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-medium hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto shadow-lg border-t-4 border-t-primary">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Buy Data Bundle</CardTitle>
                    <CardDescription>Select network and a real-time data plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-muted-foreground">Select Network Provider</Label>
                        <Select onValueChange={setSelectedNetwork} value={selectedNetwork}>
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
                        <Label className="text-xs uppercase font-black text-muted-foreground">Recipient Phone Number</Label>
                        <Input 
                            inputMode="numeric"
                            value={phoneNumber} 
                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                            maxLength={11} 
                            placeholder="08012345678" 
                            className="h-12 text-xl tracking-wider font-mono"
                        />
                    </div>

                    {selectedNetwork && (
                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-xs uppercase font-black text-muted-foreground">Select Plan (Low to High)</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search plans..." className="pl-9" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto">
                                {isLoadingPlans ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                                ) : filteredPlans.length > 0 ? filteredPlans.map((plan, idx) => (
                                    <Button 
                                        key={idx} 
                                        variant={selectedPlan === plan ? 'default' : 'outline'} 
                                        className="justify-between h-14" 
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-bold text-sm">{plan.name}</span>
                                        </div>
                                        <span className="font-black text-base">₦{plan.price.toLocaleString()}</span>
                                    </Button>
                                )) : (
                                    <div className="text-center py-8 text-muted-foreground">No matching plans found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-14 text-lg font-bold" disabled={!selectedPlan || phoneNumber.length !== 11}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirm Purchase</AlertDialogTitle></AlertDialogHeader>
                            <div className="space-y-2 text-sm">
                                <div>Network: <span className="font-bold">{selectedNetwork}</span></div>
                                <div>Plan: <span className="font-bold">{selectedPlan?.name}</span></div>
                                <div className="pt-2 text-primary font-bold text-lg border-t">Total: ₦{selectedPlan?.price.toLocaleString()}</div>
                            </div>
                            <div className="space-y-2 pt-4">
                                <Label className="font-bold">Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center h-14 text-2xl tracking-[1rem]" />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isPurchasing || pin.length !== 5}>
                                    {isPurchasing ? <Loader2 className="animate-spin" /> : 'Confirm & Pay'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
