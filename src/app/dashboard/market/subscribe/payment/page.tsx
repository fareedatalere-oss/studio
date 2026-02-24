'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Banknote, Landmark, Smartphone, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { initializeTransaction } from '@/app/actions/paystack';

export default function SubscriptionPaymentPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, profile, recheckUser } = useUser();
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    const SUBSCRIPTION_FEE = 25000;

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 5) {
            setPin(value);
        }
    };
    
    const handlePayWithBalance = async () => {
        if (!user || !profile) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        setIsLoading(true);

        try {
            if (profile.pin !== pin) {
                throw new Error("The transaction PIN you entered is incorrect.");
            }
            if ((profile.nairaBalance || 0) < SUBSCRIPTION_FEE) {
                throw new Error("Insufficient account balance to pay for the subscription.");
            }

            const newBalance = profile.nairaBalance - SUBSCRIPTION_FEE;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                isMarketplaceSubscribed: true,
                nairaBalance: newBalance,
            });

            await recheckUser();

            toast({
                title: 'Payment Successful',
                description: 'Your marketplace subscription is now active.',
            });
            router.push('/dashboard/market?subscribed=true');

        } catch (error: any) {
            toast({
                title: 'Payment Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtherPayments = async (method: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        setIsRedirecting(true);
        toast({
            title: 'Initializing Payment...',
            description: `Please wait as we redirect you to pay with ${method}.`,
        });

        const result = await initializeTransaction({ email: user.email, userId: user.$id });
        
        if (result.success && result.data.authorization_url) {
            window.location.href = result.data.authorization_url;
        } else {
            toast({
                variant: 'destructive',
                title: 'Initialization Failed',
                description: result.message || 'Could not start the payment process. Please try again.',
                duration: 8000,
            });
            setIsRedirecting(false);
        }
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
                    <CardDescription>One-time fee: ₦{SUBSCRIPTION_FEE.toLocaleString()}</CardDescription>
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
                                Enter your 5-digit transaction PIN to authorize payment of ₦{SUBSCRIPTION_FEE.toLocaleString()} from your account balance.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={pin}
                                    onChange={handlePinChange}
                                    maxLength={5}
                                    placeholder="*****"
                                    required
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePayWithBalance} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : 'Confirm & Pay'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Card>
                        <CardHeader className="pb-2">
                           <CardTitle className="text-base">Other Payment Methods</CardTitle>
                           <CardDescription className="text-xs">Powered by Paystack</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Button variant="outline" className="justify-start" onClick={() => handleOtherPayments('Bank Transfer')} disabled={isRedirecting}>
                                {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Landmark className="mr-2 h-4 w-4" />} Bank Transfer
                            </Button>
                             <Button variant="outline" className="justify-start" onClick={() => handleOtherPayments('USSD')} disabled={isRedirecting}>
                                 {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} USSD
                            </Button>
                             <Button variant="outline" className="justify-start" onClick={() => handleOtherPayments('Bank Card')} disabled={isRedirecting}>
                                 {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />} Card / Bank
                            </Button>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
