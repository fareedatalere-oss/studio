'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { generateVirtualAccount } from '@/app/actions/flutterwave';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function GetAccountNumberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bvn: '',
    phone: '',
  });

  const [step, setStep] = useState<'form' | 'displayAccount' | 'saving'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAccount, setGeneratedAccount] = useState<{ number: string; bank: string } | null>(null);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (step !== 'saving') return;

    let timer: NodeJS.Timeout;

    const performSave = async () => {
      if (!user || !firestore || !generatedAccount) return;

      const userDocRef = doc(firestore, 'users', user.uid);
      const notificationCollectionRef = collection(firestore, 'users', user.uid, 'notifications');

      const accountData = {
        accountNumber: generatedAccount.number,
        bankName: generatedAccount.bank,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        bvn: formData.bvn,
      };

      const notificationData = {
        title: 'Account Generated!',
        description: `Your new ${generatedAccount.bank} account number is ${generatedAccount.number}. You can now fund this account.`,
        type: 'system',
        isRead: false,
        createdAt: serverTimestamp(),
      };

      try {
        // Force save to database and wait for it to complete
        await setDoc(userDocRef, accountData, { merge: true });
        await addDoc(notificationCollectionRef, notificationData);
      } catch (serverError: any) {
        // If save fails, stop everything and show an error.
        clearInterval(timer);
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: serverError.message || 'Could not save your account number to the database. Please try again.',
          duration: 9000,
        });
        setCountdown(15); // Reset countdown
        setStep('displayAccount'); // Go back to the previous screen
        return;
      }
    };

    performSave();

    // Start the countdown timer. This runs in parallel to the save.
    // If the save fails, the effect in performSave will clear this timer.
    timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect once countdown is finished
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup function to clear interval if component unmounts
    return () => clearInterval(timer);
  }, [step, user, firestore, generatedAccount, formData, router, toast]);

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
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Could not find user details. Please sign in again.',
      });
      return;
    }

    setIsGenerating(true);

    try {
        const result = await generateVirtualAccount({
            email: user.email,
            firstname: formData.firstName,
            lastname: formData.lastName,
            phonenumber: formData.phone,
            bvn: formData.bvn,
        });

        if (result.success && result.data.account_number) {
            setGeneratedAccount({
                number: result.data.account_number,
                bank: result.data.bank_name,
            });
            setStep('displayAccount');
            toast({
                title: 'Account Generated!',
                description: 'Please review and save your new account details.',
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
  
  const handleSaveAndFinish = () => {
    if (!user || !firestore || !generatedAccount) {
      toast({
        title: 'Error',
        description: 'Missing required data to save. Please try generating the account again.',
        variant: 'destructive',
      });
      return;
    }
    setStep('saving');
  };

  if (step === 'saving') {
    return (
      <div className="container py-8">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Saving Your Account</CardTitle>
            <CardDescription>Please wait. Your account details are being permanently saved.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 h-48">
            <p className="text-6xl font-bold font-mono">{countdown}</p>
            <p className="text-muted-foreground">Redirecting to dashboard shortly...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'displayAccount') {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>Your New Account</CardTitle>
                    <CardDescription>Click Done to permanently save this information to your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                        <Label>Bank Name</Label>
                        <p className="text-lg font-bold">{generatedAccount?.bank}</p>
                        <Label className="mt-2">Account Number</Label>
                        <p className="text-2xl font-bold font-mono tracking-wider">{generatedAccount?.number}</p>
                    </div>
                    <Button onClick={handleSaveAndFinish} className="w-full">
                        Done
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
            Provide your details to generate a new permanent account number. Your email is {user?.email || 'loading...'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}