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
  
  // This effect handles the redirection when countdown ends.
  useEffect(() => {
    if (countdown === 0 && step === 'saving') {
      router.push('/dashboard');
    }
  }, [countdown, step, router]);

  // This effect handles the save and countdown logic.
  useEffect(() => {
    if (step !== 'saving') return;

    let timer: NodeJS.Timeout | undefined;

    // --- Real Background Save Operation ---
    // This function runs without blocking the UI.
    const performSave = () => {
      if (!user || !firestore || !generatedAccount) {
        toast({
          variant: "destructive",
          title: "Critical Error",
          description: "Could not save account due to missing data. Please try again.",
        });
        setStep('displayAccount'); // Go back on critical error
        return;
      }
      
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
      
      // Save user profile data, then notification. Non-blocking.
      setDoc(userDocRef, accountData, { merge: true })
        .then(() => addDoc(notificationCollectionRef, notificationData))
        .then(() => {
            console.log("Account and notification saved successfully in the background.");
        })
        .catch((serverError) => {
            // --- This part is crucial. It no longer freezes the app. ---
            console.error("Background save failed:", serverError);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: serverError.message || "Your account details could not be saved to the database. Please try again.",
            });
            // On failure, stop the countdown and go back.
            setStep('displayAccount');
        });
    };

    // Start the save and the countdown timer.
    performSave();
    
    timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Cleanup: if the step changes (e.g. on error), stop the timer.
    return () => {
      if (timer) clearInterval(timer);
    };

  }, [step, user, firestore, generatedAccount, formData, toast, router]);


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
    setStep('saving');
  };

  if (step === 'saving') {
    return (
      <div className="container py-8">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Saving Your Account</CardTitle>
            <CardDescription>Please wait. Your account details are being saved to the database.</CardDescription>
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
