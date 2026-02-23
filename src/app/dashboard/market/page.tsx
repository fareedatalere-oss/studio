'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Search, ChevronUp, Upload, ShoppingCart, Trash2, Phone, Book, Library, MoreVertical, Video, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, Suspense, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { databases, DATABASE_ID, COLLECTION_ID_APPS, COLLECTION_ID_PRODUCTS, COLLECTION_ID_BOOKS, COLLECTION_ID_UPWORK_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-appwrite';

function MarketContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { profile: currentUserProfile, loading: userLoading } = useUser();
  
  // Control State
  const [currentTab, setCurrentTab] = useState(searchParams.get('tab') || 'apps');
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');

  // Data State
  const [apps, setApps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [upworkProfiles, setUpworkProfiles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState({ apps: true, products: true, books: true, upwork: true });

  // Cart/Library State
  const [cart, setCart] = useState<any[]>([]);
  const [library, setLibrary] = useState<string[]>([]); // Store book IDs

  const isSubscribed = currentUserProfile?.isMarketplaceSubscribed === true;
  
  useEffect(() => {
    const fetchAndSubscribe = (collectionId: string, setter: React.Dispatch<React.SetStateAction<any[]>>, loadingKey: keyof typeof dataLoading, applyVisibilityFilter = true) => {
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.notEqual('isBanned', true),
      ];
      if (applyVisibilityFilter) {
        queries.push(Query.notEqual('isHidden', true));
      }

      const fetchData = () => {
          databases.listDocuments(DATABASE_ID, collectionId, queries)
            .then(res => setter(res.documents))
            .catch(err => {
              console.error(`Failed to fetch ${collectionId}`, err)
              toast({
                title: `Failed to load ${loadingKey}`,
                description: "Please check if database indexes are set up correctly.",
                variant: "destructive"
              });
            })
            .finally(() => setDataLoading(prev => ({...prev, [loadingKey]: false})));
      }

      // Initial fetch
      setDataLoading(prev => ({...prev, [loadingKey]: true}));
      fetchData();

      // Subscribe to changes
      const unsubscribe = databases.client.subscribe(`databases.${DATABASE_ID}.collections.${collectionId}.documents`, response => {
        // Re-fetch on any change to ensure data and filters are always in sync
        fetchData();
      });
      
      return unsubscribe;
    };
    
    const unsubApps = fetchAndSubscribe(COLLECTION_ID_APPS, setApps, 'apps');
    const unsubProducts = fetchAndSubscribe(COLLECTION_ID_PRODUCTS, setProducts, 'products');
    const unsubBooks = fetchAndSubscribe(COLLECTION_ID_BOOKS, setBooks, 'books');
    const unsubUpwork = fetchAndSubscribe(COLLECTION_ID_UPWORK_PROFILES, setUpworkProfiles, 'upwork', false);

    return () => {
        unsubApps();
        unsubProducts();
        unsubBooks();
        unsubUpwork();
    };
  }, [toast]);
  
  
  const AppItem = ({ app }: { app: any}) => (
    <Link href={`/dashboard/market/apps/${app.$id}`}>
        <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Image src={app.iconUrl} alt={app.name} width={64} height={64} className="rounded-xl" />
                <p className="font-semibold text-sm truncate w-full">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.priceType === 'free' ? 'Free' : `₦${app.price}`}</p>
            </CardContent>
        </Card>
    </Link>
  );
  
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {Array.from({length: 5}).map((_, i) => (
            <Card key={i}>
                <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-10" />
                </CardContent>
            </Card>
        ))}
    </div>
  );

  const handleBuyProduct = (product: any) => {
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
  
  const handleGetBook = (book: any) => {
    setIsLoading(true);
    setTimeout(() => {
        if (book.price > 0 && pin !== '12345') {
            toast({
                title: 'Invalid PIN',
                description: 'The transaction PIN is incorrect.',
                variant: 'destructive',
            });
        } else {
            if (book.price > 0) {
                 toast({
                    title: 'Payment Successful',
                    description: `You have purchased ${book.name}.`
                });
                toast({
                    title: 'Sale Notification Sent',
                    description: `Seller has been notified of your purchase.`
                });
            }
            toast({
                title: 'Book Saved!',
                description: `${book.name} has been added to your library.`,
            });
            setLibrary(prev => [...prev, book.id]);
        }
        setIsLoading(false);
        setPin('');
    }, 1500);
  };

  const ProductItem = ({ product }: { product: any}) => (
    <Card className="flex flex-col">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2 flex-1">
            <Image src={product.imageUrl} alt={product.name} width={80} height={80} className="rounded-xl object-cover aspect-square" />
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
                    <Link href={`/dashboard/chat/${product.sellerId}`}>Chat</Link>
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
                        if (!cart.find(item => item.$id === product.$id)) {
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
  );

  const BookItem = ({ book }: { book: any}) => (
    <Card className="flex flex-col">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2 flex-1">
            <Image src={book.coverUrl} alt={book.name} width={80} height={120} className="rounded-md object-cover shadow-md" />
            <p className="font-semibold text-sm truncate w-full mt-2">{book.name}</p>
            <p className="text-xs font-bold text-muted-foreground">{book.priceType === 'free' ? 'Free' : `₦${(book.price + 50).toLocaleString()}`}</p>
        </CardContent>
         <div className="border-t p-2 flex items-center justify-end">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Review Book</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{book.name}</AlertDialogTitle>
                                <AlertDialogDescription>{book.description}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {library.includes(book.$id) ? (
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/market/library">Go to Library</Link>
                        </DropdownMenuItem>
                    ) : book.price > 0 ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Get Book</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Enter your 5-digit PIN to purchase {book.name} for ₦{(book.price + 50).toLocaleString()}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2">
                                    <Label htmlFor={`pin-book-${book.$id}`}>5-Digit Transaction PIN</Label>
                                    <Input
                                        id={`pin-book-${book.$id}`}
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
                                    <AlertDialogAction onClick={() => handleGetBook(book)} disabled={isLoading || pin.length !== 5}>
                                        {isLoading ? 'Processing...' : 'Confirm & Pay'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <DropdownMenuItem onClick={() => handleGetBook(book)}>
                            Get Book (Free)
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
  )

  const UpworkProfileItem = ({ profile }: { profile: any }) => (
      <Card>
        <CardHeader>
            <div className="flex items-center gap-4">
                <Image src={profile.avatarUrl} alt={profile.name} width={60} height={60} className="rounded-full" />
                <div>
                    <CardTitle>{profile.name}</CardTitle>
                    <CardDescription>{profile.title}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex gap-2">
            <Button asChild className="flex-1">
                <a href={`tel:${profile.phoneNumber}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
            </Button>
             <Button asChild variant="secondary" className="flex-1">
                <Link href={`/dashboard/chat/${profile.sellerId}`}>Chat</Link>
            </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreVertical/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>View Description</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>{profile.name}</AlertDialogTitle>
                                <AlertDialogDescription>{profile.description}</AlertDialogDescription>
                            </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Close</AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardContent>
      </Card>
  )

  const UploadButton = ({ href }: { href: string }) => (
    <Button asChild>
      <Link href={isSubscribed ? href : '/dashboard/market/subscribe'}>
        <Upload className="mr-2 h-4 w-4" />
        Upload {currentTab.charAt(0).toUpperCase() + currentTab.slice(1, -1)}
      </Link>
    </Button>
  );

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
              <Link href="/dashboard/market/subscribe">Subscribe to Upload</Link>
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
                        <div key={item.$id} className="flex items-center justify-between">
                            <div className='flex items-center gap-3'>
                                <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="rounded-md" />
                                <div>
                                    <p className='font-semibold'>{item.name}</p>
                                    <p className='text-sm text-muted-foreground'>₦{(item.price + 80).toLocaleString()}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(c => c.$id !== item.$id))}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    )) : <p className="text-center text-muted-foreground pt-8">Your cart is empty.</p>}
                </div>
            </SheetContent>
        </Sheet>
      </div>
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bookstore">Bookstore</TabsTrigger>
          <TabsTrigger value="upwork">Upwork</TabsTrigger>
        </TabsList>
        
        <TabsContent value="apps" className="mt-4 space-y-4">
           <div className="flex justify-end">
                <UploadButton href="/dashboard/market/apps/upload" />
            </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for apps..." className="pl-10" />
          </div>
          {dataLoading.apps ? <LoadingSkeleton /> : (
            <Tabs defaultValue="android" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="android">Android</TabsTrigger>
                  <TabsTrigger value="ios">iOS</TabsTrigger>
              </TabsList>
              <TabsContent value="android" className="mt-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {apps.filter(a => a.platform === 'android').map(app => (
                          <AppItem key={app.$id} app={app} />
                      ))}
                  </div>
              </TabsContent>
               <TabsContent value="ios" className="mt-4">
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {apps.filter(a => a.platform === 'ios').map(app => (
                          <AppItem key={app.$id} app={app} />
                      ))}
                  </div>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
             <div className="flex justify-end">
                <UploadButton href="/dashboard/market/upload/product" />
            </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for products..." className="pl-10" />
          </div>
            {dataLoading.products ? <LoadingSkeleton /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {products.map(prod => <ProductItem key={prod.$id} product={prod} />)}
              </div>
            )}
        </TabsContent>

        <TabsContent value="bookstore" className="mt-4 space-y-4">
          <div className="flex justify-between">
              <Button asChild variant="outline">
                  <Link href="/dashboard/market/library"><Library className="mr-2 h-4 w-4" /> My Library</Link>
              </Button>
              <UploadButton href="/dashboard/market/upload/book" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for books..." className="pl-10" />
          </div>
           {dataLoading.books ? <LoadingSkeleton /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {books.map(book => <BookItem key={book.$id} book={book} />)}
              </div>
           )}
        </TabsContent>

        <TabsContent value="upwork" className="mt-4 space-y-4">
            <div className="flex justify-end">
                 <Button asChild>
                    <Link href="/dashboard/market/upwork/warning">
                        <UserPlus className="mr-2 h-4 w-4" /> Create Your Profile
                    </Link>
                </Button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search for freelancers..." className="pl-10" />
            </div>
             {dataLoading.upwork ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-4">
                  {upworkProfiles.map(profile => <UpworkProfileItem key={profile.$id} profile={profile} />)}
              </div>
             )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<div><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <MarketContent />
    </Suspense>
  )
}
