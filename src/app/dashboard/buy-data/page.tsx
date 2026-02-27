
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Search, Wifi } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { processLocalBillPayment } from '@/app/actions/bills';

const CORE_PROVIDERS = [
    { name: 'MTN' },
    { name: 'Glo' },
    { name: 'Airtel' },
    { name: '9mobile' }
];

const HARDCODED_DATA_PLANS: Record<string, any[]> = {
    'MTN': [
        { id: '123', name: 'MTN CORPORATE 500mb', price: 450 },
        { id: '106', name: 'MTN CORPORATE 1GB 30days', price: 570 },
        { id: '156', name: 'MTN GIFTING +5minute weekly', price: 970 },
        { id: '168', name: 'MTN GIFTING 75.0mb 1day', price: 75.0 },
        { id: '169', name: 'MTN GIFTING 1.GB +15min 1day', price: 500 },
    ],
    'Glo': [
        { id: '260', name: 'GLO special data 1.GB 1day', price: 395 },
        { id: '258', name: 'GLO special data 750.0mb 1day', price: 230 },
        { id: '176', name: 'GLO cooperate 2.GB 30days', price: 900 },
    ],
    'Airtel': [
        { id: '764', name: 'Airtel cooperate 1.gb 3days', price: 300 },
        { id: '759', name: 'Airtel special data 3.0gb 2days', price: 900 },
        { id: '757', name: 'Airtel special data 1.gb 1day', price: 500 },
        { id: '726', name: 'Airtel sme 500mb promo 7days', price: 200 },
    ],
    '9mobile': [
        { id: '73', name: '9mobile Gifting 1gb 30days', price: 940 },
        { id: '74', name: '9mobile gifting 2.0GB 30days', price: 1128.0 },
        { id: '184', name: '9mobile cooperate 1.GB 1 month', price: 300 },
    ]
};

export default function BuyDataPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [planSearch, setPlanSearch] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [isPurchasing, setIsPurchasing] = useState(false);

    const plans = selectedNetwork ? HARDCODED_DATA_PLANS[selectedNetwork] || [] : [];
    const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()));

    const handlePurchase = async () => {
        if (!user || !selectedPlan || !selectedNetwork) return;
        
        setIsPurchasing(true);

        const result = await processLocalBillPayment({
            userId: user.$id,
            pin,
            customer: phoneNumber,
            amount: selectedPlan.price,
            fee: 50, // Hardcoded 50 Naira fee
            type: 'data',
            narration: `${selectedNetwork} Data: ${selectedPlan.name}`
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
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Wifi className="text-primary" /> Buy Data
                    </CardTitle>
                    <CardDescription>Select network and choose a hardcoded plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-black text-muted-foreground">Select Network Provider</Label>
                        <Select onValueChange={(val) => { setSelectedNetwork(val); setSelectedPlan(null); }} value={selectedNetwork}>
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
                            <Label className="text-xs uppercase font-black text-muted-foreground">Select Plan</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search plans..." className="pl-9" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto">
                                {filteredPlans.length > 0 ? filteredPlans.map((plan, idx) => (
                                    <Button 
                                        key={idx} 
                                        variant={selectedPlan?.id === plan.id ? 'default' : 'outline'} 
                                        className="justify-between h-14" 
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-bold text-xs">{plan.name}</span>
                                        </div>
                                        <span className="font-black text-sm">₦{plan.price.toLocaleString()}</span>
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
                            <div className="space-y-2 text-sm text-foreground">
                                <p>Network: <span className="font-bold">{selectedNetwork}</span></p>
                                <p>Plan: <span className="font-bold">{selectedPlan?.name}</span></p>
                                <p>Recipient: <span className="font-bold">{phoneNumber}</span></p>
                                <div className="pt-2 text-primary font-bold text-lg border-t">Total: ₦{selectedPlan?.price.toLocaleString()}</div>
                            </div>
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
