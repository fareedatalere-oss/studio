'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { getPaystackMultiPurposeBillers, initiatePaystackTransfer } from '@/app/actions/paystack';

export default function MultiPurposePaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, profile } = useUser();

    const [step, setStep] = useState(1); // 1: Main, 2: Category Search, 3: Biller Search, 4: Details, 5: PIN
    const [categories] = useState(['Electronic', 'Water', 'School Fees', 'Registration Form', 'Taxes', 'Others']);
    const [allBillers, setAllBillers] = useState<any[]>([]);
    
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [billerSearch, setBillerSearch] = useState('');
    const [selectedBiller, setSelectedBiller] = useState<any>(null);
    
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        getPaystackMultiPurposeBillers().then(setAllBillers);
    }, []);

    const filteredCategories = categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()));
    const filteredBillers = allBillers.filter(b => 
        b.category === selectedCategory && 
        b.name.toLowerCase().includes(billerSearch.toLowerCase())
    );

    const handleFinalPayment = async () => {
        if (!user || !profile || !selectedBiller) return;
        
        if (profile.pin !== pin) {
            toast({ variant: 'destructive', title: 'Invalid PIN', description: 'The transaction PIN you entered is incorrect.' });
            return;
        }

        const totalAmount = Number(amount);
        if ((profile.nairaBalance || 0) < totalAmount) {
            toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You do not have enough funds to complete this payment.' });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await initiatePaystackTransfer({
                userId: user.$id,
                pin,
                bankCode: selectedBiller.code,
                accountNumber: selectedBiller.accountNumber,
                name: `${selectedBiller.name} - ${customerId}`,
                amount: totalAmount
            });

            if (result.success) {
                toast({ title: 'Payment Successful', description: `Your payment to ${selectedBiller.name} has been processed via Paystack.` });
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
                    <CardDescription>Pay for anything via Paystack infrastructure.</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <Button className="w-full h-16 text-lg font-bold" onClick={() => setStep(2)}>
                                Payment Multi Purpose
                            </Button>
                            <p className="text-center text-xs text-muted-foreground">Powered by Paystack API</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <Label>Choose Payment Category</Label>
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
                            <Label>Search for {selectedCategory} Provider</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder={`Search ${selectedCategory.toLowerCase()}...`} className="pl-10" value={billerSearch} onChange={e => setBillerSearch(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {filteredBillers.length > 0 ? filteredBillers.map(b => (
                                    <Button key={b.id} variant="outline" className="justify-start h-12" onClick={() => { setSelectedBiller(b); setStep(4); }}>
                                        {b.name}
                                    </Button>
                                )) : <p className="text-center text-sm text-muted-foreground">No providers found in this category.</p>}
                            </div>
                        </div>
                    )}

                    {step === 4 && selectedBiller && (
                        <div className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg text-center">
                                <p className="font-bold">{selectedBiller.name}</p>
                                <p className="text-xs text-muted-foreground">{selectedBiller.category}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custId">{selectedCategory === 'School Fees' ? 'Student ID / Reg Number' : 'Account / Meter Number'}</Label>
                                <Input id="custId" value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="Enter ID" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amt">Amount (₦)</Label>
                                <Input id="amt" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                            </div>
                            <Button className="w-full" disabled={!customerId || !amount} onClick={() => setStep(5)}>
                                Continue to Pay
                            </Button>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4 text-center">
                            <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">You are paying</p>
                                <p className="text-2xl font-bold">₦{Number(amount).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-1">To: {selectedBiller?.name}</p>
                            </div>
                            <div className="space-y-2 text-left">
                                <Label htmlFor="p">Transaction PIN</Label>
                                <Input id="p" type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" className="text-center text-lg tracking-widest" />
                            </div>
                            <Button className="w-full h-12" disabled={pin.length !== 5 || isProcessing} onClick={handleFinalPayment}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                Authorize & Pay via Paystack
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}