'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Banknote, Landmark, Smartphone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SubscriptionPaymentPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d{0,5}$/.test(value)) {
            setPin(value);
        }
    };
    
    const handlePayWithBalance = () => {
        setIsLoading(true);
        // Simulate PIN check and payment
        setTimeout(() => {
            if (pin === '12345') { // Mock correct PIN
                toast({
                    title: 'Payment Successful',
                    description: 'Your subscription is now active.',
                });
                router.push('/dashboard/market?subscribed=true');
            } else {
                toast({
                    title: 'Invalid PIN',
                    description: 'The transaction PIN you entered is incorrect.',
                    variant: 'destructive',
                });
                setIsLoading(false);
            }
        }, 1500);
    };

    const handleOtherPayments = (method: string) => {
        toast({
            title: 'Redirecting to Paystack',
            description: `Processing payment via ${method}.`,
        });
        // Simulate redirection and successful payment
        setIsLoading(true);
        setTimeout(() => {
            router.push('/dashboard/market?subscribed=true');
        }, 2000);
    }

    return (
        <div className="container py-8">
             <Link href="/dashboard/market/subscribe" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Pay For Subscription</CardTitle>
                    <CardDescription>One-time fee: ₦25,000</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full">Use Account Balance</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                            <AlertDialogDescription>
                                Enter your 5-digit transaction PIN to authorize payment of ₦25,000 from your account balance.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                                <Input
                                    id="pin"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={pin}
                                    onChange={handlePinChange}
                                    maxLength={5}
                                    placeholder="e.g. 12345"
                                    required
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePayWithBalance} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? 'Processing...' : 'Confirm & Pay'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Card>
                        <CardHeader className="pb-2">
                           <CardTitle className="text-base">Other Payment Methods</CardTitle>
                           <CardDescription className="text-xs">Powered by Paystack (+ ₦100 fee)</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Button variant="outline" className="justify-start" onClick={() => handleOtherPayments('Bank Transfer')}>
                                <Landmark className="mr-2 h-4 w-4" /> Bank Transfer
                            </Button>
                             <Button variant="outline" className="justify-start" onClick={() => handleOtherPayments('USSD')}>
                                <Smartphone className="mr-2 h-4 w-4" /> USSD
                            </Button>
                             <Button variant="outline" className="justify-start" onClick={() => handleOtherPayments('Bank Card')}>
                                <Banknote className="mr-2 h-4 w-4" /> Card / Bank
                            </Button>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
