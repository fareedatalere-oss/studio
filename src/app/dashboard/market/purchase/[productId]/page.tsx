
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PRODUCTS } from '@/lib/appwrite';
import { purchaseProduct } from '@/app/actions/market';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PurchaseProductPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser, recheckUser } = useUser();
    const productId = params.productId as string;

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [pin, setPin] = useState('');

    useEffect(() => {
        if (productId) {
            databases.getDocument(DATABASE_ID, COLLECTION_ID_PRODUCTS, productId)
                .then(doc => setProduct(doc))
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Error', description: 'Product not found.' });
                    router.push('/dashboard/market');
                })
                .finally(() => setLoading(false));
        }
    }, [productId, router, toast]);

    const handlePurchase = async () => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Please sign in to make a purchase.' });
            return;
        }
        if (pin.length !== 5) {
            toast({ variant: 'destructive', title: 'A valid 5-digit PIN is required.' });
            return;
        }

        setIsPurchasing(true);

        const result = await purchaseProduct({
            buyerId: currentUser.$id,
            productId: product.$id,
            pin,
        });

        if (result.success) {
            toast({ title: 'Purchase Successful!', description: `You have purchased ${product.name}.` });
            await recheckUser(); // Update user's balance in the UI
            router.push('/dashboard/market?tab=products');
        } else {
            toast({ title: 'Purchase Failed', description: result.message, variant: 'destructive' });
        }

        setIsPurchasing(false);
    };

    if (loading) {
        return (
            <div className="container py-8">
                <Skeleton className="h-8 w-40 mb-4" />
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader><Skeleton className="h-10 w-3/4" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="w-full h-48" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!product) {
        return null;
    }

    return (
        <div className="container py-8">
            <Link href="/dashboard/market?tab=products" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Market
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Confirm Your Purchase</CardTitle>
                    <CardDescription>Enter your PIN to complete the transaction.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Image src={product.imageUrl} alt={product.name} width={80} height={80} className="rounded-lg" />
                        <div className="flex-1">
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-lg font-bold">₦{(product.price + 80).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Includes ₦80 service fee</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                        <Input
                            id="pin"
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            maxLength={5}
                            placeholder="*****"
                            autoComplete="off"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePurchase} className="w-full" disabled={isPurchasing || pin.length !== 5}>
                        {isPurchasing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Confirm & Pay'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

