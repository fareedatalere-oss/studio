'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verifyCardPayment } from '@/app/actions/flutterwave';
import { useUser } from '@/hooks/use-appwrite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function VerificationContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (userLoading) return;

        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to verify a payment.' });
            router.replace('/dashboard');
            return;
        }

        const status = searchParams.get('status');
        const tx_ref = searchParams.get('tx_ref');
        const transaction_id = searchParams.get('transaction_id');

        if (status === 'successful' && transaction_id) {
            const verify = async () => {
                toast({ title: 'Verifying payment...' });
                const result = await verifyCardPayment(transaction_id, user.$id);
                if (result.success) {
                    toast({ title: 'Success!', description: 'Your card has been saved. Redirecting...' });
                    router.replace('/dashboard');
                } else {
                    toast({ variant: 'destructive', title: 'Verification Failed', description: result.message });
                    router.replace('/dashboard');
                }
            };
            verify();
        } else if (status === 'cancelled') {
            toast({ variant: 'destructive', title: 'Payment Cancelled', description: 'You cancelled the card verification process.' });
            router.replace('/dashboard');
        } else {
             // Handle cases with no status or failed status
             if(status || tx_ref || transaction_id) { // only show toast if there are any params
                toast({ variant: 'destructive', title: 'Payment Failed', description: 'The payment process was not completed successfully.' });
             }
             router.replace('/dashboard');
        }
    }, [searchParams, router, toast, user, userLoading]);

    return (
        <div className="container py-8 flex items-center justify-center min-h-[50vh]">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle>Verifying Payment</CardTitle>
                    <CardDescription>Please wait while we confirm your card verification.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Loader2 className="h-12 w-12 mx-auto animate-spin" />
                </CardContent>
            </Card>
        </div>
    );
}


export default function VerifyPaymentPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <VerificationContent />
        </Suspense>
    );
}