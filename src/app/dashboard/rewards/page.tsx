
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
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
    
    const [step, setStep] = useState('loading'); 
    const [referralCode, setReferralCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [monetizationLink, setMonetizationLink] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const SHRINKME_API_KEY = 'bb12d3d3b9762a5365077db9c4804ee1983895fc';

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                try {
                    const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);
                    setUserProfile(profile);
                    if (profile.hasReferral === null || profile.hasReferral === undefined) { 
                        setStep('rules');
                    } else {
                        setStep('main');
                    }
                } catch (error) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load your profile.' });
                } finally {
                    setProfileLoading(false);
                }
            };
            fetchProfile();
        } else if (!userLoading) {
            setProfileLoading(false);
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
            setStep('main');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your choice.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsProcessing(true);
        try {
            const destinationUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            const apiUrl = `https://shrinkme.click/api?api=${SHRINKME_API_KEY}&url=${encodeURIComponent(destinationUrl)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (data.status === 'success' && data.shortenedUrl) setMonetizationLink(data.shortenedUrl);
            else throw new Error(data.message || 'Failed to shorten URL.');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setMonetizationLink('');
        } finally { setIsProcessing(false); }
    };

    const handleMonetizationClick = async () => {
        if (!user || !userProfile) return;
        const newClickCount = (userProfile.clickCount || 0) + 1;
        let newRewardBalance = userProfile.rewardBalance || 0;
        const requiredClicks = userProfile.hasReferral ? 1200 : 1000;

        if (newClickCount > 0 && newClickCount % requiredClicks === 0) {
            const earnedAmount = 1500; // Updated reward: ₦1,500
            newRewardBalance += earnedAmount;
            toast({ title: '₦1,500 Reward Earned!', description: `You reached ${requiredClicks} clicks!` });
        }
        try {
             const updatedProfile = await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                clickCount: newClickCount,
                rewardBalance: newRewardBalance
            });
            setUserProfile(updatedProfile);
        } catch (error) { console.error(error); }
        setMonetizationLink('');
        setSearchQuery('');
    };
    
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
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader><CardTitle>Welcome to Rewards!</CardTitle><CardDescription>Earn real money by visiting search links.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>Standard: 1,000 Clicks = ₦1,500</p>
                        <p>With Referral: 1,200 Clicks = ₦1,500</p>
                    </div>
                    <Button onClick={handleAccept} className="w-full">Accept and Continue</Button>
                </CardContent>
            </Card>
        </div>
    );
    
    const renderReferral = () => (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader><CardTitle>One-Time Setup</CardTitle><CardDescription>Enter referral or skip.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Referral Email</Label><Input placeholder="someone@example.com" value={referralCode} onChange={e => setReferralCode(e.target.value)}/></div>
                    <div className="flex gap-2"><Button onClick={() => handleSetReferral(false)} className="w-full" disabled={isProcessing || !referralCode}>Done</Button><Button onClick={() => handleSetReferral(true)} variant="secondary" className="w-full" disabled={isProcessing}>Skip</Button></div>
                </CardContent>
            </Card>
        </div>
    );

    const renderMain = () => (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
            <div className="space-y-6">
                <Card><CardContent className="flex justify-between items-center p-6"><div><p className="text-xs uppercase font-black opacity-50">Reward Balance</p><p className="text-2xl font-black text-primary">₦{(userProfile?.rewardBalance || 0).toLocaleString()}</p></div><div><p className="text-xs uppercase font-black opacity-50">Clicks</p><p className="text-2xl font-black">{(userProfile?.clickCount || 0).toLocaleString()}</p></div></CardContent></Card>
                <Card>
                    <CardHeader><CardTitle>Start Earning</CardTitle><CardDescription>Search anything to generate a monetization link.</CardDescription></CardHeader>
                    <CardContent className="text-center space-y-4">
                        {!monetizationLink ? (
                            <div className="flex w-full items-center space-x-2">
                                <Input placeholder="Search anything..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
                                <Button onClick={handleSearch} disabled={!searchQuery || isProcessing}>{isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}</Button>
                            </div>
                        ) : (
                             <Button asChild className="w-full h-14 font-black uppercase"><a href={monetizationLink} target="_blank" rel="noopener noreferrer" onClick={handleMonetizationClick}>Earn Now (Click Me)</a></Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
    
    switch (step) {
        case 'rules': return renderRules();
        case 'referral': return renderReferral();
        case 'main': return renderMain();
        default: return null;
    }
}
