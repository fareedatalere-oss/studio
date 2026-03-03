'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCardVerificationLink, chargeTokenizedCard, syncVirtualAccountPayments } from '@/app/actions/flutterwave';
import { useRouter } from 'next/navigation';
import {
  Newspaper,
  Plane,
  CreditCard,
  Send,
  History,
  Gift,
  CircleDollarSign,
  Loader2,
  ArrowDownCircle,
  RefreshCw,
  Smartphone,
  Wifi,
  Undo2,
  Tv,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const MANAGER_EMAILS = ['i-paymanagerscare402@gmail.com', 'ipatmanager17@gmail.com'];

function DashboardContent() {
  const { user, profile: userProfile, loading: userLoading, proof, recheckUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const hasSyncedRef = useRef(false);
  
  const isLoading = userLoading;
  const isAdmin = user && MANAGER_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (user?.$id && user?.email && !hasSyncedRef.current) {
        hasSyncedRef.current = true;
        const runSync = async () => {
            const result = await syncVirtualAccountPayments(user.$id, user.email);
            if (result.success && result.amountAdded && result.amountAdded > 0) {
                toast({ title: 'New Deposit Detected!', description: `Your account was automatically credited with ₦${result.amountAdded.toLocaleString()}.` });
                await recheckUser();
            }
        };
        runSync();
    }
  }, [user, recheckUser, toast]);

  const isFeatOn = (key: string) => {
      if (isAdmin) return true;
      if (!proof) return true;
      return proof[key] !== false;
  };

  const handleActionClick = (key: string, href?: string, callback?: Function) => {
      if (!isFeatOn(key)) {
          toast({ variant: 'destructive', title: "Not Available", description: "Currently not available please try again later" });
          return;
      }
      if (callback) callback();
      else if (href) router.push(href);
  };

  const handleRefresh = async () => {
    if (!user?.$id) return;
    setIsProcessing(true);
    toast({ title: 'Processing...', description: `Checking for new transactions...` });
    try {
      const result = await syncVirtualAccountPayments(user.$id, user.email);
      if (result.success) {
        if (result.amountAdded && result.amountAdded > 0) {
          toast({ title: 'Success!', description: result.message || `Added ₦${result.amountAdded.toLocaleString()} to your wallet.` });
          await recheckUser();
        } else {
          toast({ title: 'Up to Date', description: 'No new transactions found.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Sync Notice', description: result.message || 'Service returned an unexpected response.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFundAccountClick = async () => {
    if (!user || !userProfile) return;
    setIsProcessing(true);

    if (userProfile.fwCardToken) {
        setIsFundDialogOpen(true);
        setIsProcessing(false);
    } else {
        toast({ title: 'Redirecting to add card...' });
        const redirectUrl = `${window.location.origin}/dashboard/fund/verify`;
        const result = await getCardVerificationLink({
            userId: user.$id,
            email: user.email,
            name: userProfile.username || user.name,
            redirectUrl: redirectUrl,
        });

        if (result.success && result.data.link) {
            router.push(result.data.link);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message || 'Could not start card verification.' });
            setIsProcessing(false);
        }
    }
  };

  const handleFundWithToken = async () => {
    if (!user || !pin || !fundAmount) return;
    setIsProcessing(true);
    try {
        const amount = Number(fundAmount);
        if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
        
        const result = await chargeTokenizedCard({
            userId: user.$id,
            amount,
            pin
        });

        if (result.success) {
            toast({ title: "Success!", description: result.message });
            setIsFundDialogOpen(false);
            setFundAmount('');
            setPin('');
            await recheckUser();
        } else {
            throw new Error(result.message);
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Payment Failed', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const actions = [
    { key: 'feat_send', label: 'Send', icon: Send, href: '/dashboard/transfer' },
    { key: 'feat_deposit', label: 'Deposit', icon: ArrowDownCircle, href: '/dashboard/deposit' },
    { key: 'feat_refresh', label: 'Refresh', icon: RefreshCw, onClick: handleRefresh },
    { key: 'feat_buy_airtime', label: 'Buy Airtime', icon: Smartphone, href: '/dashboard/buy-airtime' },
    { key: 'feat_buy_data', label: 'Buy Data', icon: Wifi, href: '/dashboard/buy-data' },
    { key: 'feat_history', label: 'History', icon: History, href: '/dashboard/history' },
    { key: 'feat_get_reward', label: 'Get Reward', icon: Gift, href: '/dashboard/rewards' },
    { key: 'feat_cable', label: 'Cable payment', icon: Tv, href: '/dashboard/cable-payment' },
    { key: 'feat_electric', label: 'Electric Bill', icon: Lightbulb, href: '/dashboard/electric-bill' },
    { key: 'feat_multipurpose', label: 'Multi Purpose', icon: CreditCard, href: '/dashboard/multi-purpose' },
    { key: 'feat_traveling', label: 'Traveling', icon: Plane, href: '/dashboard/travelling' },
    { key: 'feat_refund', label: 'Refund', icon: Undo2, onClick: handleFundAccountClick },
    { key: 'feat_news', label: 'News', icon: Newspaper, href: '/dashboard/news' },
  ];

  return (
    <div className="container py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle>Account Details</CardTitle>
            <Button variant="outline" size="sm" onClick={handleFundAccountClick} disabled={isProcessing}>
              {isProcessing && !isFundDialogOpen ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CircleDollarSign className="mr-2 h-4 w-4" />}
              Fund Account
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 min-h-[60px]">
              <p className="text-sm text-muted-foreground">Account Number</p>
              {isLoading ? (
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : userProfile && userProfile.accountNumber ? (
                <div>
                  <p className="font-mono text-lg font-semibold">{userProfile.accountNumber}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{userProfile.bankName}</p>
                </div>
              ) : (
                <Button asChild className="mt-1">
                  <Link href="/dashboard/get-account-number">Get Account Number</Link>
                </Button>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Naira Balance</p>
              {isLoading ? (
                <Skeleton className="h-8 w-40 mt-1" />
              ) : (
                <p className="text-2xl font-bold">₦{userProfile?.nairaBalance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                  <p className="text-sm text-muted-foreground">Reward Balance</p>
                   {isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : <p className="font-semibold">{userProfile?.rewardBalance?.toLocaleString() || '0'}</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Count</p>
                 {isLoading ? <Skeleton className="h-6 w-16 mt-1" /> : (
                    <div className="flex items-center gap-2">
                    <p className="font-semibold">{userProfile?.clickCount?.toLocaleString() || 0}</p>
                    {userProfile?.accountNumber && (
                        <Button onClick={() => handleActionClick('feat_get_reward', '/dashboard/rewards')} size="sm" className="h-auto px-2 py-1 text-xs">
                        Get Reward
                        </Button>
                    )}
                    </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-center">
          {actions.map((action) => (
             <div key={action.label} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleActionClick(action.key, action.href, action.onClick)}>
                <Button
                    variant="default"
                    size="icon"
                    className={cn("h-16 w-16 rounded-full mx-auto flex items-center justify-center", !isFeatOn(action.key) && "opacity-50 grayscale")}
                    disabled={isProcessing}
                >
                    {isProcessing && (action.label === 'Refresh' || action.label === 'Refund') ? <Loader2 className="h-6 w-6 animate-spin" /> : <action.icon className="h-6 w-6" />}
                </Button>
                <span className="mt-2 block text-xs font-medium">{action.label}</span>
            </div>
          ))}
        </div>
      </div>
      <AlertDialog open={isFundDialogOpen} onOpenChange={setIsFundDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Fund Your Account</AlertDialogTitle></AlertDialogHeader>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fund-amount">Amount to Add (₦)</Label>
                    <Input id="fund-amount" type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="fund-pin">5-Digit PIN</Label>
                    <Input id="fund-pin" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={5} />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if(!isFeatOn('feat_refund')) { toast({ variant:'destructive', title:'Off', description:'Disabled'}); return; } handleActionClick('feat_refund', undefined, handleFundWithToken); }} disabled={isProcessing || !fundAmount || pin.length !== 5}>Confirm & Pay</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
