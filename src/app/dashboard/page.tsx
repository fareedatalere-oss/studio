'use client';

import { Suspense, useEffect, useState } from 'react';
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
  CircleDollarSign,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';


function DashboardContent() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          setUserProfile(null); // No profile found or error
        } finally {
          setProfileLoading(false);
        }
      };
      fetchProfile();
    } else if (!userLoading) {
      setProfileLoading(false);
    }
  }, [user, userLoading]);

  const handleRefund = async () => {
    if (!user || !userProfile || !refundAmount || Number(refundAmount) <= 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Amount',
            description: 'Please enter a valid amount greater than zero.',
        });
        return;
    }

    setIsUpdatingBalance(true);
    try {
        const amountToAdd = Number(refundAmount);
        const currentBalance = Number(userProfile.nairaBalance || 0);
        const newBalance = currentBalance + amountToAdd;

        const updatedProfile = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID_PROFILES,
            user.$id,
            { nairaBalance: newBalance }
        );

        setUserProfile(updatedProfile);

        toast({
            title: 'Balance Updated!',
            description: `₦${amountToAdd.toLocaleString()} has been added to your account.`,
        });
        
        setIsRefundDialogOpen(false);
        setRefundAmount('');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsUpdatingBalance(false);
    }
  };


  const isLoading = userLoading || profileLoading;

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
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle>Account Details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsRefundDialogOpen(true)}>
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Refund
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
                        <Button asChild size="sm" className="h-auto px-2 py-1 text-xs">
                        <Link href="/dashboard/rewards">Get Reward</Link>
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
      <AlertDialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Simulate Funding</AlertDialogTitle>
                <AlertDialogDescription>
                    This will add the specified amount to your Naira balance for testing purposes. This is a simulation and not a real transaction.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
                <Label htmlFor="refund-amount">Amount to Add (₦)</Label>
                <Input
                    id="refund-amount"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="e.g., 50000"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRefund} disabled={isUpdatingBalance || !refundAmount || Number(refundAmount) <= 0}>
                    {isUpdatingBalance ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update Balance'}
                </AlertDialogAction>
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
