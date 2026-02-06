'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';

export default function RewardsPage() {
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();
    
    const [userProfile, setUserProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    
    // UI State
    const [step, setStep] = useState('loading'); // 'loading', 'rules', 'referral', 'main'
    const [referralCode, setReferralCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [monetizationLink, setMonetizationLink] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const OUO_API_KEY = 'YC3xdMJB';

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                try {
                    const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);
                    setUserProfile(profile);
                    if (profile.hasReferral === null) { // First time user
                        setStep('rules');
                    } else {
                        setStep('main');
                    }
                } catch (error) {
                    console.error("Failed to fetch profile", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load your profile.' });
                } finally {
                    setProfileLoading(false);
                }
            };
            fetchProfile();
        } else if (!userLoading) {
            setProfileLoading(false);
            // Redirect or show error if no user
        }
    }, [user, userLoading, toast]);


    const handleAccept = () => setStep('referral');

    const handleSetReferral = async (skipped = false) => {
        if (!user) return;
        setIsProcessing(true);

        let hasReferral = !skipped && referralCode.length > 0;

        if (hasReferral && referralCode === user.email) {
            toast({ variant: 'destructive', title: 'Invalid Referral', description: "You can't use your own email." });
            setIsProcessing(false);
            return;
        }

        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { hasReferral });
            setUserProfile((prev: any) => ({ ...prev, hasReferral }));
            if (hasReferral) {
                toast({ title: 'Referral Set!', description: 'You now have a referral bonus active.' });
            }
            setStep('main');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your choice.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSearch = () => {
        if(searchQuery) {
            const destinationUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            const generatedLink = `https://ouo.io/qs/${OUO_API_KEY}?s=${encodeURIComponent(destinationUrl)}`;
            setMonetizationLink(generatedLink);
        }
    }

    const handleMonetizationClick = async () => {
        if (!user || !userProfile) return;

        const newClickCount = (userProfile.clickCount || 0) + 1;
        let newRewardBalance = userProfile.rewardBalance || 0;

        const requiredClicks = userProfile.hasReferral ? 1200 : 1000;

        if (newClickCount > 0 && newClickCount % requiredClicks === 0) {
            const earnedAmount = 1000;
            newRewardBalance += earnedAmount;
            toast({
                title: 'Reward Earned!',
                description: `You earned ₦${earnedAmount.toLocaleString()} in your reward balance.`,
            });
        }
        
        try {
             const updatedProfile = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                clickCount: newClickCount,
                rewardBalance: newRewardBalance
            });
            setUserProfile(updatedProfile);
        } catch (error) {
            console.error("Failed to update clicks/rewards", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your progress.' });
        }

        setMonetizationLink('');
        setSearchQuery('');
    };
    
    const handleWithdraw = async () => {
        if (!user || !userProfile || (userProfile.rewardBalance || 0) < 10000) return;
        
        setIsProcessing(true);
        toast({ title: 'Processing Withdrawal...' });

        try {
            const newNairaBalance = (userProfile.nairaBalance || 0) + userProfile.rewardBalance;

            const updatedProfile = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                nairaBalance: newNairaBalance,
                rewardBalance: 0,
                clickCount: 0 // Also reset click count on withdrawal
            });
            setUserProfile(updatedProfile);
            toast({
                title: 'Withdrawal Successful!',
                description: `₦${userProfile.rewardBalance.toLocaleString()} has been added to your main balance.`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Withdrawal Failed', description: 'Could not process your withdrawal.' });
        } finally {
            setIsProcessing(false);
        }
    }
    
    if (userLoading || profileLoading || step === 'loading') {
        return (
             <div className="container py-8">
                <Skeleton className="h-8 w-36 mb-4" />
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
             </div>
        )
    }
    
    const renderRules = () => (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Welcome to Rewards!</CardTitle>
                    <CardDescription>Read the rules below to start earning.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="prose prose-sm dark:prose-invert text-sm text-muted-foreground">
                        <p>This is a Monetization link from ouo.io. To earn, you should keep clicking and be watching the ads shown to you.</p>
                    </div>
                    <Button onClick={handleAccept} className="w-full">Accept and Continue</Button>
                </CardContent>
            </Card>
        </div>
    );
    
    const renderReferral = () => (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>One-Time Setup</CardTitle>
                    <CardDescription>Enter a referral code or skip this step. This can only be done once.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                        <div className="space-y-2">
                        <Label htmlFor="referral">Referral Code (User's Email)</Label>
                        <Input 
                            id="referral" 
                            placeholder="someone@example.com"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                            <Button onClick={() => handleSetReferral(false)} className="w-full" disabled={isProcessing || !referralCode}>Done</Button>
                            <Button onClick={() => handleSetReferral(true)} variant="secondary" className="w-full" disabled={isProcessing}>Skip</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const renderMain = () => (
        <div className="container py-8">
                <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Rewards</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Reward Balance</p>
                            <p className="text-2xl font-bold">₦{(userProfile?.rewardBalance || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Click Count</p>
                            <p className="text-2xl font-bold">{(userProfile?.clickCount || 0).toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Start Earning</CardTitle>
                        <CardDescription>Use the search to get a monetization link.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        {!monetizationLink ? (
                            <div className="flex w-full items-center space-x-2">
                                <Input 
                                    type="text" 
                                    placeholder="Use random search..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Button onClick={handleSearch} disabled={!searchQuery}><Search className="h-4 w-4 mr-2" /> Search</Button>
                            </div>
                        ) : (
                             <Button
                                asChild
                                className="w-full h-12"
                            >
                               <a href={monetizationLink} target="_blank" rel="noopener noreferrer" onClick={handleMonetizationClick}>Click Monetization Link</a>
                            </Button>
                        )}

                        {(userProfile?.rewardBalance || 0) >= 10000 && (
                                <Button onClick={handleWithdraw} className="w-full mt-4" variant="secondary" disabled={isProcessing}>
                                {isProcessing ? 'Withdrawing...' : 'Withdraw Rewards'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
    
    switch (step) {
        case 'rules':
            return renderRules();
        case 'referral':
            return renderReferral();
        case 'main':
            return renderMain();
        default: // loading
            return (
                 <div className="container py-8">
                    <Skeleton className="h-8 w-36 mb-4" />
                    <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                 </div>
            );
    }
}
