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
import { useUser } from '@/hooks/use-user';
import { processDatahouseRecharge } from '@/app/actions/datahouse';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const DISCOS = [
    { id: 10, name: 'Ikeja Electric Disco' },
    { id: 11, name: 'Eko Electric' },
    { id: 12, name: 'Abuja Electric' },
    { id: 13, name: 'Kano Electric' },
    { id: 15, name: 'Port Harcourt Electric' },
    { id: 17, name: 'Kaduna Electric' },
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

        const result = await processDatahouseRecharge({
            userId: user.$id,
            pin,
            type: 'electric',
            providerId: selectedDisco.id,
            customer: meterNumber,
            amount: Number(amount),
            description: `${selectedDisco.name} Recharge`
        });

        if (result.success) {
            toast({ title: "Payment Successful", description: `Your ₦${Number(amount).toLocaleString()} recharge is complete.` });
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
                        <Lightbulb className="text-primary h-6 w-6" />
                        Electricity Bill
                    </CardTitle>
                    <CardDescription className="font-bold">Instant recharge for all Discos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 pl-1">Select Provider</Label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search Discos..." 
                                className="pl-9 h-10 rounded-xl bg-muted/50 border-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-visible">
                            {filteredDiscos.map((disco) => (
                                <Button 
                                    key={disco.id} 
                                    variant={selectedDisco?.id === disco.id ? 'default' : 'outline'}
                                    className="justify-start h-12 font-bold rounded-xl border-none bg-muted/30"
                                    onClick={() => setSelectedDisco(disco)}
                                >
                                    {disco.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="meter-number" className="text-[10px] font-black uppercase tracking-widest opacity-50 pl-1">Meter Number</Label>
                        <Input 
                            id="meter-number"
                            placeholder="Enter meter ID"
                            value={meterNumber}
                            onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, ''))}
                            className="h-12 rounded-xl bg-muted border-none px-4 font-mono text-lg tracking-widest"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest opacity-50 pl-1">Amount (₦)</Label>
                        <Input 
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-12 rounded-xl bg-muted border-none px-4 font-black text-lg"
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={!selectedDisco || meterNumber.length < 5 || !amount || isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Continue'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-center font-black uppercase tracking-tighter">Authorize Payment</AlertDialogTitle>
                                <div className="space-y-3 pt-4 text-sm font-bold text-center">
                                    <div className="p-4 bg-muted/50 rounded-2xl text-center">
                                        <p className="text-[10px] opacity-50 uppercase tracking-widest">Provider</p>
                                        <p className="text-base truncate">{selectedDisco?.name}</p>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-2xl">
                                        <p className="text-[10px] opacity-50 uppercase tracking-widest">Meter ID</p>
                                        <p className="text-lg font-mono">{meterNumber}</p>
                                    </div>
                                    <div className="pt-2 text-primary font-black text-2xl">₦{Number(amount).toLocaleString()}</div>
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
                                    {isLoading ? 'Processing...' : 'Confirm & Recharge'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
