
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lightbulb, Search } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { processLocalBillPayment } from '@/app/actions/bills';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const DISCOS = [
    { id: '10', name: 'Ikeja Electric Disco' },
    { id: '11', name: 'Eko Electric' },
    { id: '12', name: 'Abuja Electric' },
    { id: '13', name: 'Kano Electric' },
    { id: '15', name: 'Port Harcourt Electric' },
    { id: '17', name: 'Kaduna Electric' },
];

export default function ElectricBillPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDisco, setSelectedDisco] = useState<any>(null);
    const [meterNumber, setMeterNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const filteredDiscos = DISCOS.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handlePayment = async () => {
        if (!user || !selectedDisco) return;
        setIsLoading(true);

        const result = await processLocalBillPayment({
            userId: user.$id,
            pin,
            customer: meterNumber,
            amount: Number(amount),
            fee: 150, // Hardcoded hidden fee
            type: 'electricity',
            narration: `${selectedDisco.name} Recharge`
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Payment Successful", description: `Your ₦${Number(amount).toLocaleString()} recharge is complete.` });
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
                        <Lightbulb className="text-primary" />
                        Electric Bill
                    </CardTitle>
                    <CardDescription>Recharge your electricity meter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Select Disco Provider</Label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search providers..." 
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
                            {filteredDiscos.map((disco) => (
                                <Button 
                                    key={disco.id} 
                                    variant={selectedDisco?.id === disco.id ? 'default' : 'outline'}
                                    className="justify-start h-12"
                                    onClick={() => setSelectedDisco(disco)}
                                >
                                    {disco.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="meter-number">Meter Number</Label>
                        <Input 
                            id="meter-number"
                            placeholder="Enter meter number"
                            value={meterNumber}
                            onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₦)</Label>
                        <Input 
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-12" disabled={!selectedDisco || meterNumber.length < 5 || !amount}>
                                Continue
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Authorize Bill Payment</AlertDialogTitle>
                                <div className="space-y-2 text-sm text-foreground">
                                    <p>Provider: <span className="font-bold">{selectedDisco?.name}</span></p>
                                    <p>Meter: <span className="font-bold">{meterNumber}</span></p>
                                    <p className="pt-2 text-primary font-bold text-lg border-t">Amount: ₦{Number(amount).toLocaleString()}</p>
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
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm & Recharge'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
