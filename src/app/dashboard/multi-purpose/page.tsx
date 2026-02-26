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
import { getPaystackProviders, initiatePaystackTransfer } from '@/app/actions/paystack';

export default function MultiPurposePaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, profile } = useUser();

    const [step, setStep] = useState(1); 
    const [categories] = useState(['Electronic', 'Water', 'School Fees', 'Registration Form', 'Taxes', 'Others']);
    const [allProviders, setAllProviders] = useState<any[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [providerSearch, setProviderSearch] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<any>(null);
    
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setIsLoadingProviders(true);
        getPaystackProviders().then(res => {
            if (res.success) setAllProviders(res.data);
            setIsLoadingProviders(false);
        });
    }, []);

    const filteredCategories = categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()));
    
    const filteredProviders = allProviders.filter(b => 
        b.name.toLowerCase().includes(providerSearch.toLowerCase())
    );

    const handleFinalPayment = async () => {
        if (!user || !profile || !selectedProvider) return;
        
        if (profile.pin !== pin) {
            toast({ variant: 'destructive', title: 'Invalid PIN' });
            return;
        }

        const totalAmount = Number(amount);
        if ((profile.nairaBalance || 0) < totalAmount) {
            toast({ variant: 'destructive', title: 'Insufficient Balance' });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await initiatePaystackTransfer({
                userId: user.$id,
                pin,
                bankCode: selectedProvider.code,
                accountNumber: customerId, 
                name: `${selectedProvider.name} Payment`,
                amount: totalAmount
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
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="text-primary" />
                        Multi-Purpose Payment
                    </CardTitle>
                    <CardDescription>Select service and search provider</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <Button className="w-full h-16 text-lg font-bold" onClick={() => setStep(2)}>
                                Payment Multi Purpose
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <Label>Choose Category</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search categories..." className="pl-10" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {filteredCategories.map(c => (
                                    <Button key={c} variant="outline" className="justify-start h-12" onClick={() => { setSelectedCategory(c); setStep(3); }}>
                                        {c}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <Label>Select {selectedCategory} Provider</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder={`Search providers...`} className="pl-10" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                                {isLoadingProviders ? <Loader2 className="animate-spin mx-auto" /> : filteredProviders.length > 0 ? filteredProviders.map(b => (
                                    <Button key={b.id} variant="outline" className="justify-start h-12" onClick={() => { setSelectedProvider(b); setStep(4); }}>
                                        {b.name}
                                    </Button>
                                )) : <p className="text-center text-sm text-muted-foreground">No providers found.</p>}
                            </div>
                        </div>
                    )}

                    {step === 4 && selectedProvider && (
                        <div className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg text-center">
                                <p className="font-bold">{selectedProvider.name}</p>
                                <p className="text-xs text-muted-foreground">{selectedCategory}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Account / Meter / Student ID</Label>
                                <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="Enter details" />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount (₦)</Label>
                                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                            </div>
                            <Button className="w-full" disabled={!customerId || !amount} onClick={() => setStep(5)}>
                                Continue
                            </Button>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4 text-center">
                            <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">Paying</p>
                                <p className="text-2xl font-bold">₦{Number(amount).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-1">To: {selectedProvider?.name}</p>
                            </div>
                            <div className="space-y-2 text-left">
                                <Label>Transaction PIN</Label>
                                <Input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center text-lg tracking-widest" />
                            </div>
                            <Button className="w-full h-12" disabled={pin.length !== 5 || isProcessing} onClick={handleFinalPayment}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                Authorize Payment
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
