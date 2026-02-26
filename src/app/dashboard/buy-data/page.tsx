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

// Hardcoded core providers as requested
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

    const [paystackBillers, setPaystackBillers] = useState<any[]>([]);
    const [isLoadingBillers, setIsLoadingBillers] = useState(true);
    
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [plans, setPlans] = useState<any[]>([]);
    const [planSearch, setPlanSearch] = useState('');

    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        getPaystackBillers().then(res => {
            if (res.success && res.data) {
                setPaystackBillers(res.data);
            }
            setIsLoadingBillers(false);
        });
    }, []);

    // When a network is selected, find the matching biller and extract plans
    useEffect(() => {
        if (!selectedNetwork || paystackBillers.length === 0) {
            setPlans([]);
            return;
        }

        const network = CORE_PROVIDERS.find(p => p.name === selectedNetwork);
        const biller = paystackBillers.find(b => 
            b.name.toUpperCase().includes(network?.searchKey || '') && 
            b.name.toUpperCase().includes('DATA')
        );

        if (biller && biller.metadata?.items) {
            // Sort plans from Low to High price
            const sortedPlans = [...biller.metadata.items].sort((a, b) => a.price - b.price);
            setPlans(sortedPlans);
        } else {
            // High-quality fallback if API metadata is restricted
            const fallbacks = [
                { name: '500MB (Weekly)', price: 500 },
                { name: '1GB (Monthly)', price: 1000 },
                { name: '2.5GB (Monthly)', price: 1500 },
                { name: '5GB (Monthly)', price: 2500 },
                { name: '10GB (Monthly)', price: 4000 },
                { name: '20GB (Monthly)', price: 7500 }
            ];
            setPlans(fallbacks);
        }
        setSelectedPlan(null);
    }, [selectedNetwork, paystackBillers]);

    const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()));

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !selectedNetwork) return;
        
        const network = CORE_PROVIDERS.find(p => p.name === selectedNetwork);
        const biller = paystackBillers.find(b => 
            b.name.toUpperCase().includes(network?.searchKey || '') && 
            b.name.toUpperCase().includes('DATA')
        );

        setIsPurchasing(true);

        const result = await initiatePaystackBillPayment({
            userId: user.$id,
            pin,
            customer: phoneNumber,
            amount: selectedPlan.price,
            type: biller?.slug || `${selectedNetwork.toLowerCase()}_data`,
            description: `${selectedNetwork} Data: ${selectedPlan.name}`
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
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-medium hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto shadow-lg border-t-4 border-t-primary">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Buy Data Bundle</CardTitle>
                    <CardDescription>Select your network and a data plan</CardDescription>
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
                                    <SelectItem key={p.name} value={p.name} className="font-bold">
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-muted-foreground">Recipient Phone Number</Label>
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

                    {selectedNetwork && (
                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-xs uppercase font-black text-muted-foreground">Select Plan (Low to High)</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search plans (e.g. 5GB)..." 
                                    className="pl-9 h-10 text-sm" 
                                    value={planSearch} 
                                    onChange={e => setPlanSearch(e.target.value)} 
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                {isLoadingBillers ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                                ) : filteredPlans.length > 0 ? filteredPlans.map((plan, idx) => (
                                    <Button 
                                        key={idx} 
                                        variant={selectedPlan === plan ? 'default' : 'outline'} 
                                        className={selectedPlan === plan ? "justify-between h-14 border-2 border-primary" : "justify-between h-14"} 
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-sm">{plan.name}</span>
                                            <span className="text-[10px] text-muted-foreground italic">Instant Delivery</span>
                                        </div>
                                        <span className="font-black text-base">₦{plan.price.toLocaleString()}</span>
                                    </Button>
                                )) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-muted-foreground">No matching plans found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-14 text-lg font-bold" disabled={!selectedPlan || phoneNumber.length !== 11}>
                                Continue to Payment
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Data Purchase</AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2 text-foreground">
                                    <p>Network: <span className="font-bold">{selectedNetwork}</span></p>
                                    <p>Plan: <span className="font-bold">{selectedPlan?.name}</span></p>
                                    <p>Recipient: <span className="font-bold">{phoneNumber}</span></p>
                                    <p className="pt-2 text-primary font-bold text-lg border-t">Total: ₦{selectedPlan?.price.toLocaleString()}</p>
                                </AlertDialogDescription>
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
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePurchase} disabled={isPurchasing || pin.length !== 5} className="font-bold">
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
