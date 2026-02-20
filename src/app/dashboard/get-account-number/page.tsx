'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ClipboardCopy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateVirtualAccount } from '@/app/actions/flutterwave';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

export default function GetAccountNumberPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    bvn: '',
    phone: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAccount, setGeneratedAccount] = useState<{ number: string; bank: string } | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Effect to pre-fill form with existing profile data
  useEffect(() => {
    if (user) {
      databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id)
        .then(profile => {
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: profile.phone || '',
            bvn: profile.bvn || '',
          }));
        })
        .catch(error => {
          // It's okay if the profile doesn't have these fields yet, just log for debugging.
          console.log("Could not pre-fill all profile data, user might need to enter it manually.", error.message);
        })
        .finally(() => {
            setIsPageLoading(false);
        });
    } else if (!userLoading) {
        // If there's no user and we're not loading, stop loading the page.
        setIsPageLoading(false);
    }
  }, [user, userLoading]);

  // Effect for countdown timer after account generation
  useEffect(() => {
    if (generatedAccount && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (generatedAccount && countdown === 0) {
      router.push('/dashboard');
    }
  }, [generatedAccount, countdown, router]);
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'phone' || id === 'bvn') {
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [id]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    
    if (!formData.firstName || !formData.lastName || !formData.bvn || !formData.phone) {
      toast({
        variant: 'destructive',
        title: 'All Fields Required',
        description: 'Please fill out all the details to generate an account.',
      });
      return;
    }

    setIsGenerating(true);

    try {
        const result = await generateVirtualAccount({
            email: user.email, // Always use the authenticated user's email
            firstname: formData.firstName,
            lastname: formData.lastName,
            phonenumber: formData.phone,
            bvn: formData.bvn,
        });

        if (result.success && result.data.account_number) {
            const accountInfo = {
                number: result.data.account_number,
                bank: result.data.bank_name,
            };

            // Update user's main name in Appwrite Auth
            await account.updateName(`${formData.firstName} ${formData.lastName}`);
            
            // Save account number and other details to the profile
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_PROFILES,
                user.$id,
                {
                    accountNumber: accountInfo.number,
                    bankName: accountInfo.bank,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    bvn: formData.bvn,
                    username: `${formData.firstName.toLowerCase()}${formData.lastName.toLowerCase()}`, // Update username to something more meaningful
                }
            );

            setGeneratedAccount(accountInfo);
             toast({
                title: "Account Generated!",
                description: "Redirecting to dashboard shortly.",
            });
        } else {
            throw new Error(result.message || 'An unknown error occurred while generating the account.');
        }
    } catch (error: any) {
         toast({
          variant: 'destructive',
          title: 'Account Generation Failed',
          description: error.message || 'We could not generate your account number. Please try again.',
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };


  if (generatedAccount) {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>Account Generated Successfully!</CardTitle>
                    <CardDescription>
                        Here are your new account details. Redirecting to the dashboard in {countdown} seconds...
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label>Bank Name</Label>
                        <p className="font-semibold text-lg">{generatedAccount.bank}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Account Number</Label>
                        <div className="flex items-center gap-2">
                             <p className="font-mono font-semibold text-xl flex-1">{generatedAccount.number}</p>
                             <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedAccount.number)}>
                                <ClipboardCopy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <Button asChild className="w-full mt-4">
                        <Link href="/dashboard">Go to Dashboard Now</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container py-8">
      <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Generate Account Number</CardTitle>
          <CardDescription>
            Provide your details to generate a new permanent account number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPageLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="m@example.com" required readOnly/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
                </div>
                <div className="space-y-2">
                <Label htmlFor="bvn">NIN/BVN (11 digits)</Label>
                <Input id="bvn" value={formData.bvn} onChange={handleChange} required maxLength={11} minLength={11} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
                </div>
                <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                ) : 'Get Account Number'}
                </Button>
            </form>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
