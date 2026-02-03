'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function RewardsPage() {
    const { toast } = useToast();
    const [step, setStep] = useState('rules'); // rules, referral, main
    const [referralCode, setReferralCode] = useState('');
    const [clickCount, setClickCount] = useState(0);
    const [rewardBalance, setRewardBalance] = useState(0);
    const [hasReferral, setHasReferral] = useState(false);

    const handleAccept = () => {
        setStep('referral');
    };

    const handleSetReferral = () => {
        // Here you would validate the referral code against existing user emails.
        // For this prototype, we'll just check if it's not the user's own (mock) email.
        if (referralCode === "johndoe@example.com") {
             toast({
                title: 'Invalid Referral',
                description: "You can't use your own email as a referral code.",
                variant: 'destructive',
            });
            return;
        }
        if (referralCode) {
            console.log("Referral code set:", referralCode);
            setHasReferral(true);
            toast({
                title: 'Referral Set!',
                description: 'You now have a referral bonus active.',
            });
        }
        setStep('main');
    };
    
    const handleSkipReferral = () => {
        console.log("Referral skipped");
        setStep('main');
    };

    const handleMonetizationClick = () => {
        const newClickCount = clickCount + 1;
        setClickCount(newClickCount);

        let requiredClicks = hasReferral ? 1200 : 1000;

        if (newClickCount > 0 && newClickCount % requiredClicks === 0) {
            setRewardBalance(prev => prev + 1000);
            toast({
                title: 'Reward Earned!',
                description: 'You earned ₦1000 in your reward balance.',
            });
        }
    };
    
    const handleWithdraw = () => {
        // This would trigger a form/modal for bank details.
        // For now, it just resets the balances.
        toast({
            title: 'Withdrawal Initiated',
            description: 'Your request is being processed and you will be credited soon.',
        });
        setRewardBalance(0);
        setClickCount(0);
    }

    if (step === 'rules') {
        return (
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
    }
    
    if (step === 'referral') {
        return (
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
                             <Button onClick={handleSetReferral} className="w-full">Done</Button>
                             <Button onClick={handleSkipReferral} variant="secondary" className="w-full">Skip</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Main step
    return (
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
                            <p className="text-2xl font-bold">₦{rewardBalance.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Click Count</p>
                            <p className="text-2xl font-bold">{clickCount.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Start Earning</CardTitle>
                        <CardDescription>Click the link below to earn rewards.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button
                            onClick={handleMonetizationClick}
                            className="w-full h-12"
                        >
                           Click Monetization Link
                        </Button>
                        {rewardBalance >= 10000 && (
                             <Button onClick={handleWithdraw} className="w-full mt-4" variant="secondary">
                                Withdraw Rewards
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
