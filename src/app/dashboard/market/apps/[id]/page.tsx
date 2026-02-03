'use client';

import { useState } from 'react';
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

const mockApp = {
  id: '1',
  name: 'I-Pay Connect',
  icon: 'https://picsum.photos/seed/app1/200/200',
  price: '₦500',
  isFree: false,
  developerEmail: 'dev@ipay.com',
  description: 'The best way to connect with friends and family on I-Pay. Secure, fast, and reliable messaging. Share photos, videos, and more with end-to-end encryption.',
  screenshots: [
    'https://picsum.photos/seed/screen1/400/800',
    'https://picsum.photos/seed/screen2/400/800',
    'https://picsum.photos/seed/screen3/400/800',
    'https://picsum.photos/seed/screen4/400/800',
  ],
};

const mockComments = [
  { id: 1, user: { name: 'John S.', avatar: 'https://picsum.photos/seed/102/100/100', id: 'user2' }, text: 'Great app! Very useful.' },
  { id: 2, user: { name: 'Alice J.', avatar: 'https://picsum.photos/seed/103/100/100', id: 'user3' }, text: 'Love the new update. Keep up the good work.' },
];

export default function AppDetailsPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = () => {
    setIsLoading(true);
    // Simulate PIN check, payment, and download
    setTimeout(() => {
      if (mockApp.isFree || pin === '12345') {
        toast({
          title: 'Download Started',
          description: `${mockApp.name} is being downloaded to your device.`,
        });
        if (!mockApp.isFree) {
            toast({
                title: 'Payment Successful',
                description: `You have purchased ${mockApp.name}.`
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

  const DownloadButton = () => (
    mockApp.isFree ? (
        <Button onClick={() => handleDownload()} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download (Free)
        </Button>
    ) : (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download ({mockApp.price})
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter your 5-digit PIN to purchase and download {mockApp.name} for {mockApp.price}.
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
          <Image src={mockApp.icon} alt={mockApp.name} width={80} height={80} className="rounded-2xl" />
          <div className="flex-1">
            <CardTitle>{mockApp.name}</CardTitle>
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mockApp.description}</p>
            </div>

             {/* Screenshots */}
            <div id="screenshots">
                <h3 className="font-semibold mb-2 text-lg">Screenshots</h3>
                <Link href={`/dashboard/market/apps/${params.id}/screenshots`}>
                    <div className="relative h-48 w-full rounded-lg overflow-hidden group">
                        <Image src={mockApp.screenshots[0]} alt="Screenshot" fill className="object-cover"/>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-8 w-8 text-white"/>
                        </div>
                    </div>
                </Link>
            </div>
            
            {/* Comments */}
            <div id="comments">
                <h3 className="font-semibold mb-2 text-lg">Comments</h3>
                <div className="space-y-4">
                    {mockComments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                            <Link href={`/dashboard/chat/${comment.user.id}`}>
                                <Avatar>
                                    <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                                    <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div className='flex-1'>
                                <p className="font-semibold text-sm">{comment.user.name}</p>
                                <p className="text-sm text-muted-foreground">{comment.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-4">
                    <Textarea placeholder="Drop a comment..." />
                    <Button className="mt-2">Send</Button>
                </div>
            </div>

            {/* Contact */}
            <div id="contact">
                 <h3 className="font-semibold mb-2 text-lg">Contact Developer</h3>
                 <a href={`mailto:${mockApp.developerEmail}`} className="block">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5" />
                                <span className="font-medium">Send Email</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </a>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
