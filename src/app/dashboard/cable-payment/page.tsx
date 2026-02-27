
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
import { useUser } from '@/hooks/use-appwrite';
import { processLocalBillPayment } from '@/app/actions/bills';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const CABLE_PLANS = [
    { id: '28', name: 'Gotv smallie', price: 1900 },
    { id: '29', name: 'Gotv jinja bouquets', price: 3900 },
    { id: '31', name: 'Gotv max', price: 8500 },
    { id: '32', name: 'Dstv compact', price: 19000 },
    { id: '33', name: 'Dstv compact plus', price: 30000 },
    { id: '45', name: 'Startimes super', price: 9800 },
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

        const result = await processLocalBillPayment({
            userId: user.$id,
            pin,
            customer: cableNumber,
            amount: selectedPlan.price,
            fee: 50, // Hardcoded hidden fee
            type: 'tv_subscription',
            narration: selectedPlan.name
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Payment Successful", description: `You have renewed ${selectedPlan.name}.` });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: "Payment Failed", description: result.message });
        }
    };

    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-medium hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tv className="text-primary" />
                        Cable Payment
                    </CardTitle>
                    <CardDescription>Select a plan and enter your cable number.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Select Plan</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {CABLE_PLANS.map((plan) => (
                                <Button 
                                    key={plan.id} 
                                    variant={selectedPlan?.id === plan.id ? 'default' : 'outline'}
                                    className="justify-between h-14"
                                    onClick={() => setSelectedPlan(plan)}
                                >
                                    <span className="font-semibold">{plan.name}</span>
                                    <span className="font-bold">₦{plan.price.toLocaleString()}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cable-number">IUC / Smart Card Number</Label>
                        <Input 
                            id="cable-number"
                            placeholder="Enter number"
                            value={cableNumber}
                            onChange={(e) => setCableNumber(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-12" disabled={!selectedPlan || cableNumber.length < 10}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Cable Payment</AlertDialogTitle>
                                <div className="space-y-2 text-sm text-foreground">
                                    <p>Plan: <span className="font-bold">{selectedPlan?.name}</span></p>
                                    <p>Number: <span className="font-bold">{cableNumber}</span></p>
                                    <p className="pt-2 text-primary font-bold text-lg border-t">Total: ₦{selectedPlan?.price.toLocaleString()}</p>
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
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePayment} disabled={isLoading || pin.length !== 5}>
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
