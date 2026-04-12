'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Tv } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { processDatahouseRecharge } from '@/app/actions/datahouse';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const CABLE_PLANS = [
    { id: 28, name: 'Gotv smallie', price: 1900 },
    { id: 29, name: 'Gotv jinja bouquets', price: 3900 },
    { id: 31, name: 'Gotv max', price: 8500 },
    { id: 32, name: 'Dstv compact', price: 19000 },
    { id: 33, name: 'Dstv compact plus', price: 30000 },
    { id: 45, name: 'Startimes super', price: 9800 },
];

export default function CablePaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [cableNumber, setCableNumber] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = async () => {
        if (!user || !selectedPlan) return;
        setIsLoading(true);

        const result = await processDatahouseRecharge({
            userId: user.$id,
            pin,
            type: 'cable',
            providerId: selectedPlan.id,
            customer: cableNumber,
            amount: selectedPlan.price,
            description: selectedPlan.name
        });

        if (result.success) {
            toast({ title: "Payment Successful", description: `You have renewed ${selectedPlan.name}.` });
            router.push(`/dashboard/receipt/${result.transactionId}`);
        } else {
            toast({ variant: 'destructive', title: "Payment Failed", description: result.message });
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-medium hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto border-t-4 border-t-primary rounded-[2rem] shadow-xl overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4 text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Tv className="text-primary h-6 w-6" />
                        Cable TV Payment
                    </CardTitle>
                    <CardDescription className="font-bold">Renew your DSTV, GOTV or Startimes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 pl-1">Select Plan</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-visible">
                            {CABLE_PLANS.map((plan) => (
                                <Button 
                                    key={plan.id} 
                                    variant={selectedPlan?.id === plan.id ? 'default' : 'outline'}
                                    className="justify-between h-14 rounded-xl border-none bg-muted/50 hover:bg-primary/10 transition-all"
                                    onClick={() => setSelectedPlan(plan)}
                                >
                                    <span className="font-bold text-xs">{plan.name}</span>
                                    <span className="font-black text-sm text-primary">₦{plan.price.toLocaleString()}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cable-number" className="text-[10px] font-black uppercase tracking-widest opacity-50 pl-1">IUC / Smart Card Number</Label>
                        <Input 
                            id="cable-number"
                            placeholder="Enter 10-digit number"
                            value={cableNumber}
                            onChange={(e) => setCableNumber(e.target.value.replace(/\D/g, ''))}
                            className="h-12 rounded-xl bg-muted border-none px-4 font-mono text-lg tracking-widest"
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={!selectedPlan || cableNumber.length < 10 || isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Continue'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-center font-black uppercase tracking-tighter">Confirm Payment</AlertDialogTitle>
                                <div className="space-y-3 pt-4 text-sm font-bold text-center">
                                    <div className="p-4 bg-muted/50 rounded-2xl">
                                        <p className="text-[10px] opacity-50 uppercase tracking-widest">Plan</p>
                                        <p className="text-lg">{selectedPlan?.name}</p>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-2xl">
                                        <p className="text-[10px] opacity-50 uppercase tracking-widest">Customer ID</p>
                                        <p className="text-lg font-mono">{cableNumber}</p>
                                    </div>
                                    <div className="pt-2 text-primary font-black text-2xl">₦{selectedPlan?.price.toLocaleString()}</div>
                                </div>
                            </AlertDialogHeader>
                            <div className="space-y-2 pt-4">
                                <Label className="font-black uppercase text-[10px] opacity-50 tracking-widest pl-2">Enter 5-Digit Transaction PIN</Label>
                                <Input 
                                    type="password" 
                                    inputMode="numeric"
                                    value={pin} 
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} 
                                    maxLength={5} 
                                    placeholder="*****" 
                                    className="text-center text-2xl tracking-[1.2rem] h-16 bg-muted border-none rounded-2xl" 
                                />
                            </div>
                            <AlertDialogFooter className="flex-row gap-2 pt-4">
                                <AlertDialogCancel className="flex-1 rounded-xl font-black uppercase text-[10px]">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePayment} disabled={isLoading || pin.length !== 5} className="flex-1 rounded-xl font-black uppercase text-[10px]">
                                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                    {isLoading ? 'Processing...' : 'Pay Instantly'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
