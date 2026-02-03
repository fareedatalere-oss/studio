'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Search, ChevronUp, Upload, AppWindow } from 'lucide-react';
import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

const mockApps = [
  { id: '1', name: 'I-Pay Connect', icon: 'https://picsum.photos/seed/app1/200/200', platform: 'android', price: 'Free' },
  { id: '2', name: 'Wallet Pro', icon: 'https://picsum.photos/seed/app2/200/200', platform: 'android', price: '₦500' },
  { id: '3', name: 'Finance Tracker', icon: 'https://picsum.photos/seed/app3/200/200', platform: 'ios', price: '₦1200' },
  { id: '4', name: 'Photo Editor+', icon: 'https://picsum.photos/seed/app4/200/200', platform: 'ios', price: 'Free' },
];

function MarketContent() {
  const searchParams = useSearchParams();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [apps, setApps] = useState(mockApps);

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
  }, [searchParams, apps]);
  
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
  )

  return (
    <div className="container py-4">
      <div className="flex justify-end mb-4">
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

        <TabsContent value="products" className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for products..." className="pl-10" />
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
