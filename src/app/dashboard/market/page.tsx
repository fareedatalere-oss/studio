'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Search, ChevronUp, Upload, ShoppingCart, Trash2, Phone } from 'lucide-react';
import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { MoreVertical } from 'lucide-react';

const mockApps = [
  { id: '1', name: 'I-Pay Connect', icon: 'https://picsum.photos/seed/app1/200/200', platform: 'android', price: 'Free' },
  { id: '2', name: 'Wallet Pro', icon: 'https://picsum.photos/seed/app2/200/200', platform: 'android', price: '₦500' },
  { id: '3', name: 'Finance Tracker', icon: 'https://picsum.photos/seed/app3/200/200', platform: 'ios', price: '₦1200' },
  { id: '4', name: 'Photo Editor+', icon: 'https://picsum.photos/seed/app4/200/200', platform: 'ios', price: 'Free' },
];

const mockProducts = [
    { id: 'p1', name: 'Wireless Headphones', icon: 'https://picsum.photos/seed/prod1/200/200', price: 15000, contactType: 'chat', description: 'High-fidelity wireless headphones with noise cancellation.' },
    { id: 'p2', name: 'Leather Wallet', icon: 'https://picsum.photos/seed/prod2/200/200', price: 4500, contactType: 'call', contactInfo: '08012345678', description: 'Handcrafted genuine leather wallet.' },
];

function MarketContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [apps, setApps] = useState(mockApps);
  const [products, setProducts] = useState(mockProducts);
  const [cart, setCart] = useState<typeof mockProducts[0][]>([]);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      setIsSubscribed(true);
    }
    if (searchParams.get('new_app') === 'true') {
      const newApp = { id: '5', name: 'My Uploaded App', icon: 'https://picsum.photos/seed/newapp/200/200', platform: 'android', price: 'Free' };
      if (!apps.find(app => app.id === newApp.id)) {
        setApps(prev => [newApp, ...prev]);
      }
    }
     if (searchParams.get('new_product') === 'true') {
      const newProduct = { id: 'p3', name: 'New Gadget', icon: 'https://picsum.photos/seed/newprod/200/200', price: 7500, contactType: 'chat', description: 'A brand new gadget just for you!' };
      if (!products.find(p => p.id === newProduct.id)) {
        setProducts(prev => [newProduct, ...prev]);
      }
    }
  }, [searchParams, apps, products]);
  
  const AppItem = ({ app }: { app: typeof mockApps[0]}) => (
    <Link href={`/dashboard/market/apps/${app.id}`}>
        <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Image src={app.icon} alt={app.name} width={64} height={64} className="rounded-xl" />
                <p className="font-semibold text-sm truncate w-full">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.price}</p>
            </CardContent>
        </Card>
    </Link>
  );

  const handleBuyProduct = (product: typeof mockProducts[0]) => {
    setIsLoading(true);
    // Simulate PIN check, payment, and notifications
    setTimeout(() => {
        if (pin === '12345') {
            toast({
                title: 'Payment Successful',
                description: `You have purchased ${product.name}.`
            });
             toast({
                title: 'Sale Notification Sent',
                description: `Seller has been notified of your purchase.`
            });
             // Remove from cart if it was there
            setCart(currentCart => currentCart.filter(item => item.id !== product.id));
        } else {
            toast({
                title: 'Invalid PIN',
                description: 'The transaction PIN is incorrect.',
                variant: 'destructive',
            });
        }
        setIsLoading(false);
        setPin('');
    }, 1500);
  };

  const ProductItem = ({ product }: { product: typeof mockProducts[0]}) => (
    <Card className="flex flex-col">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2 flex-1">
            <Image src={product.icon} alt={product.name} width={80} height={80} className="rounded-xl object-cover aspect-square" />
            <p className="font-semibold text-sm truncate w-full mt-2">{product.name}</p>
            <p className="text-sm font-bold">₦{(product.price + 80).toLocaleString()}</p>
        </CardContent>
        <div className="border-t p-2 flex items-center justify-between">
             {product.contactType === 'call' ? (
                <Button asChild variant="ghost" size="sm">
                    <a href={`tel:${product.contactInfo}`}><Phone className="h-4 w-4 mr-1" /> Call</a>
                </Button>
            ) : (
                 <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/chat/seller-${product.id}`}>Chat</Link>
                </Button>
            )}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>View Description</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{product.name}</AlertDialogTitle>
                                <AlertDialogDescription>{product.description}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Close</AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Buy Product</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Enter your 5-digit PIN to purchase {product.name} for ₦{(product.price + 80).toLocaleString()}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <div className="space-y-2">
                                <Label htmlFor="pin-product">5-Digit Transaction PIN</Label>
                                <Input
                                    id="pin-product"
                                    type="password"
                                    inputMode="numeric"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    maxLength={5}
                                    placeholder="e.g. 12345"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleBuyProduct(product)} disabled={isLoading || pin.length !== 5}>
                                    {isLoading ? 'Processing...' : 'Confirm & Pay'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <DropdownMenuItem onClick={() => {
                        if (!cart.find(item => item.id === product.id)) {
                            setCart(prev => [...prev, product]);
                            toast({title: 'Added to Cart', description: `${product.name} has been added to your cart.`});
                        } else {
                             toast({title: 'Already in Cart', description: `${product.name} is already in your cart.`});
                        }
                    }}>Add to Cart</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
  )

  return (
    <div className="container py-4">
      <div className="flex justify-between items-center mb-4">
        {isSubscribed ? (
           <Button variant="outline" disabled>
             <ChevronUp className="mr-2 h-4 w-4" />
             Subscribed
           </Button>
        ) : (
            <Button asChild>
              <Link href="/dashboard/market/subscribe">Subscribe</Link>
            </Button>
        )}
        <Sheet>
            <SheetTrigger asChild>
                 <Button variant="outline" size="icon" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">{cart.length}</span>}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Shopping Cart</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    {cart.length > 0 ? cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                            <div className='flex items-center gap-3'>
                                <Image src={item.icon} alt={item.name} width={48} height={48} className="rounded-md" />
                                <div>
                                    <p className='font-semibold'>{item.name}</p>
                                    <p className='text-sm text-muted-foreground'>₦{(item.price + 80).toLocaleString()}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(c => c.id !== item.id))}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    )) : <p className="text-center text-muted-foreground pt-8">Your cart is empty.</p>}
                </div>
            </SheetContent>
        </Sheet>
      </div>
      <Tabs defaultValue="apps" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bookstore">Bookstore</TabsTrigger>
          <TabsTrigger value="upwork">Upwork</TabsTrigger>
        </TabsList>
        
        <TabsContent value="apps" className="mt-4 space-y-4">
           {isSubscribed && (
            <div className="flex justify-end">
                <Button asChild>
                    <Link href="/dashboard/market/apps/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload App
                    </Link>
                </Button>
            </div>
           )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for apps..." className="pl-10" />
          </div>
          <Tabs defaultValue="android" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="android">Android</TabsTrigger>
                <TabsTrigger value="ios">iOS</TabsTrigger>
            </TabsList>
            <TabsContent value="android" className="mt-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {apps.filter(a => a.platform === 'android').map(app => (
                        <AppItem key={app.id} app={app} />
                    ))}
                </div>
            </TabsContent>
             <TabsContent value="ios" className="mt-4">
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {apps.filter(a => a.platform === 'ios').map(app => (
                        <AppItem key={app.id} app={app} />
                    ))}
                </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
             {isSubscribed && (
                <div className="flex justify-end">
                    <Button asChild>
                        <Link href="/dashboard/market/upload/product">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Product
                        </Link>
                    </Button>
                </div>
            )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for products..." className="pl-10" />
          </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map(prod => <ProductItem key={prod.id} product={prod} />)}
            </div>
        </TabsContent>

        <TabsContent value="bookstore" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for books..." className="pl-10" />
          </div>
          <Button>Library</Button>
        </TabsContent>

        <TabsContent value="upwork" className="mt-4">
            <Button asChild>
                <a href="https://www.upwork.com" target="_blank" rel="noopener noreferrer">
                    <ArrowRight className="mr-2 h-4 w-4" /> Go to Upwork
                </a>
            </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarketContent />
    </Suspense>
  )
}
