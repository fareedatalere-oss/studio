
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle, Loader2, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { getBillCategories, initiateFlutterwaveBill } from '@/app/actions/flutterwave';

export default function MultiPurposePaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, profile } = useUser();

    const [step, setStep] = useState(1); 
    const [allBillers, setAllBillers] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoadingBillers, setIsLoadingBillers] = useState(true);
    
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [billerSearch, setBillerSearch] = useState('');
    const [selectedBiller, setSelectedBiller] = useState<any>(null);
    
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setIsLoadingBillers(true);
        getBillCategories().then(res => {
            if (res.success && res.data) {
                setAllBillers(res.data);
                const groups = Array.from(new Set(res.data.map((b: any) => b.bill_group))).filter(Boolean) as string[];
                setCategories(['All', ...groups]);
            }
            setIsLoadingBillers(false);
        });
    }, []);

    const filteredCategories = categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()));
    
    const filteredBillers = allBillers.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(billerSearch.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || b.bill_group === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleFinalPayment = async () => {
        if (!user || !profile || !selectedBiller) return;
        
        if (profile.pin !== pin) {
            toast({ variant: 'destructive', title: 'Invalid PIN' });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await initiateFlutterwaveBill({
                userId: user.$id,
                pin,
                customer: customerId,
                amount: Number(amount),
                type: selectedBiller.biller_code,
                billerCode: selectedBiller.biller_code,
                isData: false
            });

            if (result.success) {
                toast({ title: 'Payment Successful' });
                router.push('/dashboard');
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Payment Failed', description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container py-8">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => step > 1 ? setStep(step - 1) : router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
            </div>

            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="text-primary" />Multi-Purpose Payment</CardTitle>
                    <CardDescription>Live billers directly from our service provider</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    {isLoadingBillers ? (
                        <div className="flex flex-col items-center justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground mt-4">Syncing billers...</p>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="space-y-4">
                                    <Label>Choose Service Category</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Search categories..." className="pl-10" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
                                        {filteredCategories.map(c => (
                                            <Button key={c} variant="outline" className="justify-start h-12 capitalize" onClick={() => { setSelectedCategory(c); setStep(2); }}>
                                                {c.replace(/_/g, ' ')}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <Label>Select Provider from {selectedCategory}</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder={`Search providers...`} className="pl-10" value={billerSearch} onChange={e => setBillerSearch(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                        {filteredBillers.length > 0 ? filteredBillers.map((b, idx) => (
                                            <Button key={idx} variant="outline" className="justify-start h-12" onClick={() => { setSelectedBiller(b); setStep(3); }}>
                                                {b.name}
                                            </Button>
                                        )) : <p className="text-center text-sm text-muted-foreground">No providers found.</p>}
                                    </div>
                                </div>
                            )}

                            {step === 3 && selectedBiller && (
                                <div className="space-y-4">
                                    <div className="bg-muted p-4 rounded-lg text-center">
                                        <p className="font-bold">{selectedBiller.name}</p>
                                        <p className="text-xs text-muted-foreground uppercase">{selectedBiller.bill_group}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Account / Meter / Customer ID</Label>
                                        <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="Enter details" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount (₦)</Label>
                                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <Button className="w-full h-12" disabled={!customerId || !amount} onClick={() => setStep(4)}>Continue</Button>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-4 text-center">
                                    <div className="p-4 border rounded-lg">
                                        <p className="text-sm text-muted-foreground">Authorize Payment</p>
                                        <p className="text-2xl font-bold">₦{Number(amount).toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground mt-1">To: {selectedBiller?.name}</p>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Label>Transaction PIN</Label>
                                        <Input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center text-lg tracking-widest" />
                                    </div>
                                    <Button className="w-full h-12" disabled={pin.length !== 5 || isProcessing} onClick={handleFinalPayment}>
                                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                        Pay Instantly
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
