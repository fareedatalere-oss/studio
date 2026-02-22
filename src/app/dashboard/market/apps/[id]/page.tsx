'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Download,
  MessageCircle,
  Mail,
  ChevronRight,
  Star,
  FileText,
  Camera,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useParams } from 'next/navigation';
import { databases, DATABASE_ID, COLLECTION_ID_APPS } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppDetailsPage() {
  const { toast } = useToast();
  const params = useParams();
  const appId = params.id as string;
  
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    databases.getDocument(DATABASE_ID, COLLECTION_ID_APPS, appId)
      .then(doc => setApp(doc))
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Could not load app details.' }))
      .finally(() => setLoading(false));
  }, [appId, toast]);


  const handleDownload = () => {
    setIsLoading(true);
    // This is still a mock action as payment logic is not yet built
    setTimeout(() => {
      if (app.priceType === 'free' || pin === '12345') { // using mock pin
        toast({
          title: 'Download Started',
          description: `${app.name} is being downloaded to your device.`,
        });
        if (app.priceType !== 'free') {
            toast({
                title: 'Payment Successful',
                description: `You have purchased ${app.name}.`
            });
             toast({
                title: 'Sale Notification Sent',
                description: `Seller has been notified of your purchase.`
            });
        }
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

  if (loading) {
    return (
        <div className="container py-8">
             <Skeleton className="h-8 w-48 mb-4" />
             <Card>
                <CardHeader><Skeleton className="h-10 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-40 w-full" />
                </CardContent>
             </Card>
        </div>
    )
  }

  if (!app) {
     return (
        <div className="container py-8 text-center">
            <p>App not found.</p>
            <Button asChild variant="link"><Link href="/dashboard/market">Back to Market</Link></Button>
        </div>
    )
  }
  
  const DownloadButton = () => (
    app.priceType === 'free' ? (
        <Button onClick={() => handleDownload()} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download (Free)
        </Button>
    ) : (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (₦{app.price})
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter your 5-digit PIN to purchase and download {app.name} for ₦{app.price}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="pin">5-Digit Transaction PIN</Label>
                    <Input
                        id="pin"
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
                    <AlertDialogAction onClick={handleDownload} disabled={isLoading || pin.length !== 5}>
                        {isLoading ? 'Processing...' : 'Confirm & Pay'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
  );

  return (
    <div className="container py-8">
      <Link href="/dashboard/market" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Market
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Image src={app.iconUrl} alt={app.name} width={80} height={80} className="rounded-2xl" />
          <div className="flex-1">
            <CardTitle>{app.name}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>4.5 (1.2k reviews)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className='p-4 bg-muted/50 rounded-lg'>
                 <DownloadButton />
            </div>
            
            {/* App Description */}
            <div id="description">
                <h3 className="font-semibold mb-2 text-lg">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.description}</p>
            </div>

             {/* Screenshots */}
            <div id="screenshots">
                <h3 className="font-semibold mb-2 text-lg">Screenshots</h3>
                <Link href={`/dashboard/market/apps/${params.id}/screenshots`}>
                    <div className="relative h-48 w-full rounded-lg overflow-hidden group">
                        <Image src={app.screenshots[0]} alt="Screenshot" fill className="object-cover"/>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-8 w-8 text-white"/>
                        </div>
                    </div>
                </Link>
            </div>
            
            {/* Comments */}
            <div id="comments">
                <h3 className="font-semibold mb-2 text-lg">Comments</h3>
                 <p className="text-sm text-muted-foreground">Comments coming soon.</p>
                 <div className="mt-4">
                    <Textarea placeholder="Drop a comment..." />
                    <Button className="mt-2">Send</Button>
                </div>
            </div>

            {/* Contact */}
            <div id="contact">
                 <h3 className="font-semibold mb-2 text-lg">Contact Seller</h3>
                 <Link href={`/dashboard/chat/${app.sellerId}`} className="block">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MessageCircle className="h-5 w-5" />
                                <span className="font-medium">Chat with Seller</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
