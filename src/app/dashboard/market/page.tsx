'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ChevronUp, Upload, ShoppingCart, Trash2, Phone, Library, MoreVertical, MessageSquare, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-appwrite';
import { purchaseBook } from '@/app/actions/market';
import { databases, DATABASE_ID, COLLECTION_ID_APPS, COLLECTION_ID_PRODUCTS, COLLECTION_ID_BOOKS, COLLECTION_ID_UPWORK_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Skeleton } from '@/components/ui/skeleton';

function MarketContent() {
  const { toast } = useToast();
  const { user: currentUser, profile: currentUserProfile, recheckUser } = useUser();
  
  const [currentTab, setCurrentTab] = useState('apps');
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');

  const [apps, setApps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [upworkProfiles, setUpworkProfiles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [cart, setCart] = useState<any[]>([]);
  const [library, setLibrary] = useState<string[]>([]);

  const isSubscribed = currentUserProfile?.isMarketplaceSubscribed === true;
  
  const fetchData = async () => {
    setDataLoading(true);
    try {
        const [appsRes, productsRes, booksRes, upworkRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_APPS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_PRODUCTS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_BOOKS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_UPWORK_PROFILES, [Query.orderDesc('$createdAt'), Query.limit(100)])
        ]);

        setApps(appsRes.documents.filter(doc => !doc.isBanned && !doc.isHidden));
        setProducts(productsRes.documents.filter(doc => !doc.isBanned && !doc.isHidden));
        setBooks(booksRes.documents.filter(doc => !doc.isBanned && !doc.isHidden));
        setUpworkProfiles(upworkRes.documents.filter(doc => !doc.isBanned));
    } catch (e: any) {
        console.error("Market fetch error:", e);
    } finally {
        setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    try {
        const localLibraryStr = localStorage.getItem('ipay-library');
        const localLibrary = localLibraryStr ? JSON.parse(localLibraryStr) : [];
        setLibrary(localLibrary.map((b: any) => b.$id));
    } catch (e) {
        console.error("Could not load library from local storage", e);
    }
  }, []);

  const handleGetBook = async (book: any) => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Please sign in.' });
            return;
        }
        
        setIsLoading(true);

        if (book.priceType === 'paid') {
            const result = await purchaseBook({
                buyerId: currentUser.$id,
                bookId: book.$id,
                pin,
            });

            if (!result.success) {
                toast({ variant: 'destructive', title: 'Payment Failed', description: result.message });
                setIsLoading(false);
                setPin('');
                return;
            }
            await recheckUser();
        }
        
        try {
            const localLibraryStr = localStorage.getItem('ipay-library');
            let localLibrary = localLibraryStr ? JSON.parse(localLibraryStr) : [];
            
            if (!localLibrary.find((b: any) => b.$id === book.$id)) {
                localLibrary.push(book);
                localStorage.setItem('ipay-library', JSON.stringify(localLibrary));
            }
            
            setLibrary(prev => [...new Set([...prev, book.$id])]);
            toast({ title: 'Success!', description: `Added to library.` });

        } catch (e) {
            console.error(e);
        }

        setIsLoading(false);
        setPin('');
    };

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

  const ProductItem = ({ product }: { product: any}) => (
    <Card className="flex flex-col">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2 flex-1">
            <Image src={product.imageUrl} alt={product.name} width={80} height={80} className="rounded-xl object-cover aspect-square" />
            <p className="font-semibold text-sm truncate w-full mt-2">{product.name}</p>
            <p className="text-sm font-bold">₦{(product.price + 80).toLocaleString()}</p>
        </CardContent>
        <div className="border-t p-2 flex items-center justify-between gap-1">
            <div className="flex gap-1 flex-1">
                {product.contactType === 'call' && (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <a href={`tel:${product.contactInfo}`} title="Call Seller"><Phone className="h-4 w-4" /></a>
                    </Button>
                )}
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary">
                    <Link href={`/dashboard/chat/${product.sellerId}`} title="Chat with Seller"><MessageSquare className="h-4 w-4" /></Link>
                </Button>
            </div>
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
                            <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <DropdownMenuItem asChild><Link href={`/dashboard/market/purchase/${product.$id}`}>Buy Product</Link></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        if (!cart.find(item => item.$id === product.$id)) {
                            setCart(prev => [...prev, product]);
                            toast({title: 'Added to Cart'});
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
         <div className="border-t p-2 flex items-center justify-between">
             <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Link href={`/dashboard/chat/${book.sellerId}`} title="Chat with Author"><MessageSquare className="h-4 w-4" /></Link>
            </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild><Link href={`/dashboard/market/book/${book.$id}/read`}>Read Book</Link></DropdownMenuItem>
                    {library.includes(book.$id) ? (
                        <DropdownMenuItem asChild><Link href="/dashboard/market/library">In Library</Link></DropdownMenuItem>
                    ) : (
                        <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Get Book</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm</AlertDialogTitle>
                                    <AlertDialogDescription>Enter PIN to get {book.name}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2">
                                    <Label>PIN</Label>
                                    <Input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="*****" />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleGetBook(book)} disabled={isLoading || (book.priceType === 'paid' && pin.length !== 5)}>
                                        {isLoading ? 'Wait...' : 'Confirm'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
  );

  const UploadButton = ({ href }: { href: string }) => (
    <Button asChild>
      <Link href={isSubscribed ? href : '/dashboard/market/subscribe'}>
        <Upload className="mr-2 h-4 w-4" />
        Upload {currentTab.charAt(0).toUpperCase() + currentTab.slice(1, -1)}
      </Link>
    </Button>
  );

  if (dataLoading) {
      return (
          <div className="container py-12 flex justify-center items-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
      );
  }

  return (
    <div className="container py-4">
      <div className="flex justify-between items-center mb-4">
        {isSubscribed ? (
           <Button variant="outline" disabled><ChevronUp className="mr-2 h-4 w-4" />Subscribed</Button>
        ) : (
            <Button asChild><Link href="/dashboard/market/subscribe">Subscribe to Upload</Link></Button>
        )}
        <Sheet>
            <SheetTrigger asChild>
                 <Button variant="outline" size="icon" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">{cart.length}</span>}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader><SheetTitle>Cart</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-4">
                    {cart.length > 0 ? cart.map(item => (
                        <div key={item.$id} className="flex items-center justify-between">
                            <div className='flex items-center gap-3'>
                                <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="rounded-md" />
                                <div><p className='font-semibold'>{item.name}</p></div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(c => c.$id !== item.$id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    )) : <p className="text-center text-muted-foreground pt-8">Empty.</p>}
                </div>
            </SheetContent>
        </Sheet>
      </div>
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bookstore">Books</TabsTrigger>
          <TabsTrigger value="upwork">Upwork</TabsTrigger>
        </TabsList>
        
        <TabsContent value="apps" className="mt-4 space-y-4">
           <div className="flex w-full justify-end"><UploadButton href="/dashboard/market/apps/upload" /></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search apps..." className="pl-10" />
          </div>
          <Tabs defaultValue="android" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="android">Android</TabsTrigger>
                  <TabsTrigger value="ios">iOS</TabsTrigger>
              </TabsList>
              <TabsContent value="android" className="mt-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {apps.filter((a: any) => a.platform === 'android').map((app: any) => <AppItem key={app.$id} app={app} />)}
                  </div>
              </TabsContent>
               <TabsContent value="ios" className="mt-4">
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {apps.filter((a: any) => a.platform === 'ios').map((app: any) => <AppItem key={app.$id} app={app} />)}
                  </div>
              </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
             <div className="flex w-full justify-end"><UploadButton href="/dashboard/market/upload/product" /></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search products..." className="pl-10" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((prod: any) => <ProductItem key={prod.$id} product={prod} />)}
          </div>
        </TabsContent>

        <TabsContent value="bookstore" className="mt-4 space-y-4">
          <div className="flex justify-between">
              <Button asChild variant="outline"><Link href="/dashboard/market/library"><Library className="mr-2 h-4 w-4" /> Library</Link></Button>
              <UploadButton href="/dashboard/market/upload/book" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search books..." className="pl-10" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {books.map((book: any) => <BookItem key={book.$id} book={book} />)}
          </div>
        </TabsContent>

        <TabsContent value="upwork" className="mt-4 space-y-4">
            <div className="flex w-full justify-end"><Button asChild><Link href="/dashboard/market/upwork/warning"><UserPlus className="mr-2 h-4 w-4" /> Create Profile</Link></Button></div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search freelancers..." className="pl-10" />
            </div>
            <div className="space-y-4">
                {upworkProfiles.map((profile: any) => (
                    <Card key={profile.$id}>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Image src={profile.avatarUrl} alt={profile.name} width={60} height={60} className="rounded-full" />
                                <div><CardTitle>{profile.name}</CardTitle><CardDescription>{profile.title}</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Button asChild className="flex-1"><a href={`tel:${profile.phoneNumber}`}><Phone className="mr-2 h-4 w-4" /> Call</a></Button>
                            <Button asChild variant="secondary" className="flex-1"><Link href={`/dashboard/chat/${profile.sellerId}`}><MessageSquare className="mr-2 h-4 w-4" /> Chat</Link></Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MarketPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <MarketContent />
        </Suspense>
    );
}
