'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifyMarketplaceSubscription } from '@/app/actions/paystack';

function VerificationContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { user, loading: userLoading, recheckUser } = useUser();

    useEffect(() => {
        if (userLoading) return;

        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to verify a payment.' });
            router.replace('/dashboard/market/subscribe');
            return;
        }

        const reference = searchParams.get('reference');

        if (reference) {
            const verify = async () => {
                toast({ title: 'Verifying payment...' });
                const result = await verifyMarketplaceSubscription(reference, user.$id);
                if (result.success) {
                    toast({ title: 'Success!', description: result.message, duration: 5000 });
                    await recheckUser();
                    router.replace('/dashboard/market?subscribed=true');
                } else {
                    toast({ variant: 'destructive', title: 'Verification Failed', description: result.message, duration: 8000 });
                    router.replace('/dashboard/market/subscribe/payment');
                }
            };
            verify();
        } else {
             toast({ variant: 'destructive', title: 'Verification Error', description: 'No payment reference found.' });
             router.replace('/dashboard/market/subscribe/payment');
        }
    }, [searchParams, router, toast, user, userLoading, recheckUser]);

    return (
        <div className="container py-8 flex items-center justify-center min-h-[50vh]">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle>Verifying Subscription</CardTitle>
                    <CardDescription>Please wait while we confirm your payment with Paystack.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Loader2 className="h-12 w-12 mx-auto animate-spin" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifySubscriptionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <VerificationContent />
        </Suspense>
    );
}
