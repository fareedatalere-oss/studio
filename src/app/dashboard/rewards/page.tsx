'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RewardsPage() {
    const [step, setStep] = useState('rules'); // rules, referral, main
    const [referralCode, setReferralCode] = useState('');

    const handleAccept = () => {
        setStep('referral');
    };

    const handleSetReferral = () => {
        // Here you would validate the referral code
        console.log("Referral code set:", referralCode);
        setStep('main');
    };
    
    const handleSkipReferral = () => {
        console.log("Referral skipped");
        setStep('main');
    };

    if (step === 'rules') {
        return (
            <div className="container py-8 flex justify-center items-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Welcome to Rewards!</CardTitle>
                        <CardDescription>Read the rules below to start earning.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="prose prose-sm dark:prose-invert">
                            <p>This is a Monetization link from ouo.io. To earn, you should keep clicking and be watching the ads shown to you.</p>
                            <ul>
                                <li>Each valid click on a monetized link increases your Click Count.</li>
                                <li>Every 1000 clicks converts to ₦1000 in your Reward Balance.</li>
                                <li>Using a valid referral code gives you a head start!</li>
                            </ul>
                        </div>
                        <Button onClick={handleAccept} className="w-full">Accept and Continue</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (step === 'referral') {
        return (
            <div className="container py-8 flex justify-center items-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>One-Time Setup</CardTitle>
                        <CardDescription>Enter a referral code or skip this step.</CardDescription>
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
                            <p className="text-xs text-muted-foreground">You cannot use your own email.</p>
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
            <h1 className="text-2xl font-bold mb-4">Start Earning</h1>
            <p className="text-center text-muted-foreground">The main rewards interface will be here.</p>
        </div>
    );
}
