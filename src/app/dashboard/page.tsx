'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import {
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
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, profile: userProfile, loading: userLoading, proof, recheckUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  
  const isLoading = userLoading;

  const isFeatOn = (key: string) => {
      if (!proof) return true;
      return proof[key] !== false;
  };

  const handleActionClick = (key: string, href?: string, callback?: Function) => {
      if (!isFeatOn(key)) {
          toast({ variant: 'destructive', title: "Not Available", description: "Currently not available, please try again later" });
          return;
      }
      if (callback) callback();
      else if (href) router.push(href);
  };

  const handleRefresh = async () => {
    setIsProcessing(true);
    await recheckUser();
    toast({ title: 'Balance Updated' });
    setIsProcessing(false);
  };

  const actions = [
    { key: 'feat_ai', label: 'Sofia AI', icon: Bot, href: '/dashboard/ai-chat' },
    { key: 'feat_send', label: 'Transfer', icon: Send, href: '/dashboard/transfer' },
    { key: 'feat_deposit', label: 'Deposit', icon: ArrowDownCircle, href: '/dashboard/deposit' },
    { key: 'feat_refresh', label: 'Refresh', icon: RefreshCw, onClick: handleRefresh },
    { key: 'feat_buy_airtime', label: 'Airtime', icon: Smartphone, href: '/dashboard/buy-airtime' },
    { key: 'feat_buy_data', label: 'Data', icon: Wifi, href: '/dashboard/buy-data' },
    { key: 'feat_history', label: 'History', icon: History, href: '/dashboard/history' },
    { key: 'feat_get_reward', label: 'Reward', icon: Gift, href: '/dashboard/rewards' },
    { key: 'feat_cable', label: 'Cable TV', icon: Tv, href: '/dashboard/cable-payment' },
    { key: 'feat_electric', label: 'Electricity', icon: Lightbulb, href: '/dashboard/electric-bill' },
    { key: 'feat_multipurpose', label: 'Multi-pay', icon: CreditCard, href: '/dashboard/multi-purpose' },
    { key: 'feat_refund', label: 'Refund', icon: Undo2, href: '/dashboard/deposit' },
  ];

  return (
    <div className="container py-6 space-y-6">
      <Card className="rounded-[2.2rem] shadow-xl border-none bg-gradient-to-br from-white to-muted/20 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-6">
          <CardTitle className="text-[10px] font-black tracking-widest opacity-60">My Wallet</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/deposit')} disabled={isProcessing} className="rounded-full h-6 px-3 border-primary text-primary hover:bg-primary hover:text-white font-black text-[8px] uppercase transition-all">
            {isProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CircleDollarSign className="mr-1 h-3 w-3" />}
            Fund
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pb-6 px-6">
          <div className="space-y-0.5 min-h-[35px]">
            <p className="text-[7px] font-black opacity-40 tracking-widest">Account Number</p>
            {isLoading ? (
              <div className="space-y-1 pt-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2 w-16" />
              </div>
            ) : userProfile?.accountNumber ? (
              <div>
                <p className="font-black text-base tracking-tighter leading-none">{userProfile.accountNumber}</p>
                <p className="text-[7px] text-primary font-black uppercase mt-0.5">{userProfile.bankName}</p>
              </div>
            ) : (
              <Button asChild size="sm" className="mt-1 rounded-full font-black uppercase text-[7px] tracking-widest h-6 px-4">
                <Link href="/dashboard/get-account-number">Get Account Number</Link>
              </Button>
            )}
          </div>

          <div>
            <p className="text-[7px] font-black opacity-40 tracking-widest">Available Balance</p>
            {isLoading ? (
              <Skeleton className="h-5 w-24 mt-1" />
            ) : (
              <p className="text-xl font-black tracking-tighter text-foreground">₦{userProfile?.nairaBalance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed">
            <div>
                <p className="text-[6px] font-black opacity-40 tracking-widest">Reward</p>
                 {isLoading ? <Skeleton className="h-3 w-10 mt-1" /> : <p className="font-black text-xs text-orange-500">{userProfile?.rewardBalance?.toLocaleString() || '0'}</p>}
            </div>
            <div>
              <p className="text-[6px] font-black opacity-40 tracking-widest">Click</p>
               {isLoading ? <Skeleton className="h-3 w-8 mt-1" /> : (
                  <div className="flex items-center gap-2">
                  <p className="font-black text-xs text-blue-500">{userProfile?.clickCount?.toLocaleString() || 0}</p>
                  {userProfile?.accountNumber && (
                      <Button onClick={() => handleActionClick('feat_get_reward', '/dashboard/rewards')} size="sm" className="h-3 px-1.5 text-[5px] font-black uppercase rounded-full">
                      Claim
                      </Button>
                  )}
                  </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-y-5 gap-x-2 text-center pb-6">
        {actions.map((action) => (
           <div key={action.label} className="flex flex-col items-center gap-1 cursor-pointer group" onClick={() => handleActionClick(action.key, action.href, action.onClick)}>
              <div
                  className={cn(
                      "h-11 w-11 rounded-xl mx-auto flex items-center justify-center transition-all active:scale-90 shadow-sm border border-border/50 group-hover:border-primary/20",
                      !isFeatOn(action.key) && "opacity-50 grayscale",
                      action.label === 'Sofia AI' ? "bg-primary text-white shadow-md border-none" : "bg-white text-foreground"
                  )}
              >
                  {isProcessing && action.label === 'Refresh' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <action.icon className="h-5 w-5" />}
              </div>
              <span className="mt-1 block text-[9px] font-bold text-foreground/80">{action.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
