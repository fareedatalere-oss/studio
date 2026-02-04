'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function RewardsPage() {
    const { toast } = useToast();
    const [step, setStep] = useState('rules'); // 'rules', 'referral', 'main'
    const [referralCode, setReferralCode] = useState('');
    const [clickCount, setClickCount] = useState(0);
    const [rewardBalance, setRewardBalance] = useState(0);
    const [hasReferral, setHasReferral] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [monetizationLink, setMonetizationLink] = useState('');

    const OUO_API_KEY = 'YC3xdMJB';

    const handleAccept = () => {
        setStep('referral');
    };

    const handleSetReferral = () => {
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
    
    const handleSearch = () => {
        if(searchQuery) {
            const destinationUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            const generatedLink = `https://ouo.io/qs/${OUO_API_KEY}?s=${encodeURIComponent(destinationUrl)}`;
            setMonetizationLink(generatedLink);
        }
    }

    const handleMonetizationClick = () => {
        const newClickCount = clickCount + 1;
        setClickCount(newClickCount);
        setMonetizationLink('');
        setSearchQuery('');

        let requiredClicks = hasReferral ? 1200 : 1000;

        if (newClickCount > 0 && newClickCount % requiredClicks === 0) {
            const earnedAmount = 1000;
            setRewardBalance(prev => prev + earnedAmount);
            toast({
                title: 'Reward Earned!',
                description: `You earned ₦${earnedAmount} in your reward balance.`,
            });
        }
         // Simulate referral bonus
        if (hasReferral && newClickCount > 0 && newClickCount % 1200 === 0) {
            // In a real app, you would credit the referrer.
            console.log("Crediting 200 click count to referrer");
        }
    };
    
    const handleWithdraw = () => {
        toast({
            title: 'Withdrawal Initiated',
            description: 'Your request is being processed and you will be credited soon.',
        });
        setRewardBalance(0);
        setClickCount(0);
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
                            <Button onClick={handleSetReferral} className="w-full">Done</Button>
                            <Button onClick={handleSkipReferral} variant="secondary" className="w-full">Skip</Button>
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
                                onClick={handleMonetizationClick}
                                className="w-full h-12"
                                asChild
                            >
                               <a href={monetizationLink} target="_blank" rel="noopener noreferrer">Click Monetization Link</a>
                            </Button>
                        )}

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
    
    switch (step) {
        case 'rules':
            return renderRules();
        case 'referral':
            return renderReferral();
        case 'main':
            return renderMain();
        default:
            return renderRules();
    }
}
