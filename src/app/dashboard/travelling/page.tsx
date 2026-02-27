
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plane, Loader2, CheckCircle, Search, Landmark } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { getBillCategories, initiateFlutterwaveBill } from '@/app/actions/flutterwave';

export default function TravellingPage() {
    const { toast } = useToast();
    const { user } = useUser();
    
    const [step, setStep] = useState(1); 
    const [providers, setProviders] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [selectedProvider, setSelectedProvider] = useState<any>(null);
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchAirlines = async () => {
            setLoading(true);
            const res = await getBillCategories('AIRLINE');
            if (res.success) {
                setProviders(res.data);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load airline providers.' });
            }
            setLoading(false);
        };
        fetchAirlines();
    }, [toast]);

    const filtered = providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    const handleBooking = async () => {
        if (!user || !selectedProvider) return;
        setIsProcessing(true);
        try {
            const result = await initiateFlutterwaveBill({
                userId: user.$id,
                pin,
                customer: customerId,
                amount: Number(amount),
                type: selectedProvider.biller_code,
                billerCode: selectedProvider.biller_code,
                narration: `Travel: ${selectedProvider.name}`
            });

            if (result.success) {
                toast({ title: 'Payment Successful', description: 'Your travel booking has been processed.' });
                setStep(4);
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Payment Failed', description: e.message });
        } finally {
            setIsProcessing(false);
        }
    }

  return (
    <div className="container py-8">
       <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Plane className="text-primary" />
                Travel & Flights
            </CardTitle>
            <CardDescription>
                Pay for domestic and international flights in Nigeria.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <>
                    {step === 1 && (
                        <div className="space-y-4">
                            <Label>Select Airline / Provider</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search airlines..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {filtered.map((p, idx) => (
                                    <Button key={idx} variant="outline" className="justify-start h-12" onClick={() => { setSelectedProvider(p); setStep(2); }}>
                                        {p.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && selectedProvider && (
                        <div className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg text-center">
                                <p className="font-bold">{selectedProvider.name}</p>
                                <p className="text-xs text-muted-foreground uppercase">{selectedProvider.bill_group}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Booking ID / Reference Number</Label>
                                <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="Enter details" />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Amount (₦)</Label>
                                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                            </div>
                            <Button className="w-full h-12" disabled={!customerId || !amount} onClick={() => setStep(3)}>Continue</Button>
                            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>Change Provider</Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 text-center">
                            <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">Authorize Payment</p>
                                <p className="text-2xl font-bold">₦{Number(amount).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-1">To: {selectedProvider?.name}</p>
                            </div>
                            <div className="space-y-2 text-left">
                                <Label>Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center text-lg tracking-widest" />
                            </div>
                            <Button className="w-full h-12" disabled={pin.length !== 5 || isProcessing} onClick={handleBooking}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                Pay Instantly
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>Back</Button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 text-center">
                            <div className="p-6 bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Booking Payment Successful</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Your flight payment to {selectedProvider?.name} has been processed. Please check your airline for confirmation.
                                </p>
                            </div>
                            <Button asChild className="w-full">
                                <Link href="/dashboard">Back to Home</Link>
                            </Button>
                        </div>
                    )}
                </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
