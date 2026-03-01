'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ChevronUp, Upload, ShoppingCart, Trash2, Phone, Library, MoreVertical, MessageSquare, UserPlus, Loader2, ArrowLeft, Home } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
        <Card className="hover:bg-muted/50 transition-colors shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Image src={app.iconUrl} alt={app.name} width={64} height={64} className="rounded-xl shadow-md" />
                <p className="font-bold text-sm truncate w-full tracking-tighter uppercase">{app.name}</p>
                <p className="text-[10px] font-black text-primary uppercase">{app.priceType === 'free' ? 'Free' : `₦${app.price}`}</p>
            </CardContent>
        </Card>
    </Link>
  );

  const ProductItem = ({ product }: { product: any}) => (
    <Card className="flex flex-col shadow-sm">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2 flex-1">
            <Image src={product.imageUrl} alt={product.name} width={80} height={80} className="rounded-xl object-cover aspect-square shadow-sm" />
            <p className="font-bold text-xs truncate w-full mt-2 uppercase">{product.name}</p>
            <p className="text-sm font-black text-primary">₦{(product.price + 80).toLocaleString()}</p>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
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
    <Card className="flex flex-col shadow-sm">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2 flex-1">
            <Image src={book.coverUrl} alt={book.name} width={80} height={120} className="rounded-md object-cover shadow-md" />
            <p className="font-bold text-xs truncate w-full mt-2 uppercase">{book.name}</p>
            <p className="text-[10px] font-black text-muted-foreground uppercase">{book.priceType === 'free' ? 'Free' : `₦${(book.price + 50).toLocaleString()}`}</p>
        </CardContent>
         <div className="border-t p-2 flex items-center justify-between">
             <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Link href={`/dashboard/chat/${book.sellerId}`} title="Chat with Author"><MessageSquare className="h-4 w-4" /></Link>
            </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
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
    <Button asChild className="font-black uppercase text-xs h-10 shadow-lg">
      <Link href={isSubscribed ? href : '/dashboard/market/subscribe'}>
        <Upload className="mr-2 h-4 w-4" />
        Upload {currentTab.charAt(0).toUpperCase() + currentTab.slice(1, -1)}
      </Link>
    </Button>
  );

  if (dataLoading) {
      return (
          <div className="h-screen flex justify-center items-center bg-background">
              <Loader2 className="animate-spin h-12 w-12 text-primary" />
          </div>
      );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      
      {/* Fixed Immersive Header */}
      <div className="p-4 pt-12 flex items-center justify-between gap-4 bg-muted/30 backdrop-blur-md border-b">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-background/50 border shadow-sm">
            <Link href="/dashboard"><Home className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
            <h1 className="font-black uppercase text-sm tracking-widest text-primary">Marketplace</h1>
        </div>
        <div className="flex items-center gap-2">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative h-10 w-10 rounded-full shadow-sm">
                        <ShoppingCart className="h-5 w-5" />
                        {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">{cart.length}</span>}
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader><SheetTitle>Your Shopping Cart</SheetTitle></SheetHeader>
                    <div className="mt-6 space-y-4">
                        {cart.length > 0 ? cart.map(item => (
                            <div key={item.$id} className="flex items-center justify-between p-2 border rounded-xl">
                                <div className='flex items-center gap-3'>
                                    <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="rounded-md" />
                                    <div><p className='font-bold text-sm uppercase'>{item.name}</p></div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(c => c.$id !== item.$id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        )) : <div className="text-center py-20 text-muted-foreground"><ShoppingCart className="mx-auto h-12 w-12 opacity-20 mb-4"/><p className="font-bold uppercase text-xs tracking-widest">Cart is empty</p></div>}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
            {isSubscribed ? (
            <Badge variant="outline" className="h-10 px-4 font-black uppercase text-[10px] tracking-tighter border-primary text-primary bg-primary/5">
                <ChevronUp className="mr-2 h-4 w-4" /> Lifetime Partner
            </Badge>
            ) : (
                <Button asChild size="sm" className="font-black uppercase text-[10px] h-10 shadow-lg"><Link href="/dashboard/market/subscribe">Become a Seller</Link></Button>
            )}
            <UploadButton href={`/dashboard/market/${currentTab === 'bookstore' ? 'upload/book' : currentTab === 'apps' ? 'apps/upload' : 'upload/product'}`} />
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted h-12 rounded-2xl p-1">
                <TabsTrigger value="apps" className="rounded-xl font-black uppercase text-[10px] tracking-tighter">Apps</TabsTrigger>
                <TabsTrigger value="products" className="rounded-xl font-black uppercase text-[10px] tracking-tighter">Items</TabsTrigger>
                <TabsTrigger value="bookstore" className="rounded-xl font-black uppercase text-[10px] tracking-tighter">Books</TabsTrigger>
                <TabsTrigger value="upwork" className="rounded-xl font-black uppercase text-[10px] tracking-tighter">Pros</TabsTrigger>
            </TabsList>
            
            <TabsContent value="apps" className="mt-6 space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search applications..." className="pl-11 h-12 rounded-2xl bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
            <Tabs defaultValue="android" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-transparent border-b h-auto p-0">
                    <TabsTrigger value="android" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black uppercase text-[10px] pb-3">Android</TabsTrigger>
                    <TabsTrigger value="ios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black uppercase text-[10px] pb-3">iOS</TabsTrigger>
                </TabsList>
                <TabsContent value="android" className="mt-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {apps.filter((a: any) => a.platform === 'android').map((app: any) => <AppItem key={app.$id} app={app} />)}
                    </div>
                </TabsContent>
                <TabsContent value="ios" className="mt-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {apps.filter((a: any) => a.platform === 'ios').map((app: any) => <AppItem key={app.$id} app={app} />)}
                    </div>
                </TabsContent>
            </Tabs>
            </TabsContent>

            <TabsContent value="products" className="mt-6 space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search items for sale..." className="pl-11 h-12 rounded-2xl bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((prod: any) => <ProductItem key={prod.$id} product={prod} />)}
            </div>
            </TabsContent>

            <TabsContent value="bookstore" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
                <Button asChild variant="outline" size="sm" className="font-black uppercase text-[10px] rounded-full px-6">
                    <Link href="/dashboard/market/library"><Library className="mr-2 h-4 w-4" /> My Offline Library</Link>
                </Button>
            </div>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Find your next read..." className="pl-11 h-12 rounded-2xl bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {books.map((book: any) => <BookItem key={book.$id} book={book} />)}
            </div>
            </TabsContent>

            <TabsContent value="upwork" className="mt-6 space-y-4">
                <div className="flex w-full justify-end">
                    <Button asChild variant="secondary" size="sm" className="font-black uppercase text-[10px] rounded-full px-6">
                        <Link href="/dashboard/market/upwork/warning"><UserPlus className="mr-2 h-4 w-4" /> Join Freelance Network</Link>
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search skilled professionals..." className="pl-11 h-12 rounded-2xl bg-muted/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary" />
                </div>
                <div className="grid gap-4">
                    {upworkProfiles.map((profile: any) => (
                        <Card key={profile.$id} className="rounded-3xl shadow-sm overflow-hidden border-none bg-muted/30">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14 ring-2 ring-primary ring-offset-2">
                                        <AvatarImage src={profile.avatarUrl} />
                                        <AvatarFallback className="font-black">{profile.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="font-black uppercase text-sm tracking-tighter">{profile.name}</CardTitle>
                                        <CardDescription className="text-primary font-bold text-[10px] uppercase">{profile.title}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
                                <div className="flex gap-2">
                                    <Button asChild className="flex-1 rounded-2xl font-black uppercase text-[10px]"><a href={`tel:${profile.phoneNumber}`}><Phone className="mr-2 h-3 w-3" /> Call</a></Button>
                                    <Button asChild variant="secondary" className="flex-1 rounded-2xl font-black uppercase text-[10px]"><Link href={`/dashboard/chat/${profile.sellerId}`}><MessageSquare className="mr-2 h-3 w-3" /> Chat</Link></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function MarketPage() {
    return (
        <Suspense fallback={<div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
            <MarketContent />
        </Suspense>
    );
}
