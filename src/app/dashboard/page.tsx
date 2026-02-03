'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bot,
  Landmark,
  Newspaper,
  Plane,
  School,
  Send,
  Wrench,
  History,
  Gift,
} from 'lucide-react';
import Link from 'next/link';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState({
    number: '',
    nairaBalance: '5000.00',
    rewardBalance: '0',
    clickCount: 0,
  });

  useEffect(() => {
    const accountNumber = searchParams.get('accountNumber');
    if (accountNumber) {
      setAccount((prev) => ({
        ...prev,
        number: accountNumber,
      }));
    }
  }, [searchParams]);

  const actions = [
    { label: 'Send', icon: Send, href: '/dashboard/transfer' },
    { label: 'Utilities', icon: Wrench, href: '/dashboard/utilities' },
    { label: 'History', icon: History, href: '/dashboard/history' },
    { label: 'Get Reward', icon: Gift, href: '/dashboard/rewards' },
    { label: 'Get Loans', icon: Landmark, href: '/dashboard/get-loan' },
    { label: 'School Payment', icon: School, href: '/dashboard/school-payment' },
    { label: 'Traveling', icon: Plane, href: '/dashboard/travelling' },
    { label: 'AI', icon: Bot, href: '/dashboard/ai-chat' },
    { label: 'News', icon: Newspaper, href: '/dashboard/news' },
  ];

  return (
    <div className="container py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              {account.number ? (
                <p className="font-mono text-lg font-semibold">
                  {account.number}
                </p>
              ) : (
                <Button asChild className="mt-1">
                  <Link href="/dashboard/get-account-number">Get Account Number</Link>
                </Button>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Naira Balance</p>
              <p className="text-2xl font-bold">₦{account.nairaBalance}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                  <p className="text-sm text-muted-foreground">Reward Balance</p>
                  <p className="font-semibold">{account.rewardBalance}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Count</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{account.clickCount}</p>
                  {account.number && (
                    <Button asChild size="sm" className="h-auto px-2 py-1 text-xs">
                      <Link href="/dashboard/rewards">Get Reward</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-center">
          {actions.map((action) => (
             <Link key={action.label} href={action.href} className="flex flex-col items-center gap-1">
              <Button
                variant="default"
                size="icon"
                className="h-16 w-16 rounded-full mx-auto flex items-center justify-center flex-col gap-1"
              >
                <action.icon className="h-6 w-6" />
              </Button>
              <span className="mt-2 block text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
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
