'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { generateVirtualAccount } from '@/app/actions/flutterwave';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

  const [step, setStep] = useState<'form' | 'countdown' | 'congrats' | 'displayAccount' | 'saving'>('form');
  const [countdown, setCountdown] = useState(15);
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null);
  const [generatedAccount, setGeneratedAccount] = useState<{ number: string; bank: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (step === 'countdown' && countdown === 0) {
      if (generatedAccount) {
        setStep('congrats');
      } else {
        toast({
          variant: 'destructive',
          title: 'Account Generation Failed',
          description: apiError || 'We could not generate your account number. Please try again.',
        });
        setStep('form');
      }
    }
    return () => clearTimeout(timer);
  }, [step, countdown, generatedAccount, toast, apiError]);

   useEffect(() => {
    let timer: NodeJS.Timeout;
    if (saveCountdown !== null && saveCountdown > 0) {
        timer = setTimeout(() => setSaveCountdown(saveCountdown - 1), 1000);
    } else if (saveCountdown === 0) {
        router.push('/dashboard');
    }
    return () => clearTimeout(timer);
  }, [saveCountdown, router]);


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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Could not find user details. Please sign in again.',
      });
      return;
    }

    setStep('countdown');
    setCountdown(15);
    setApiError(null);
    setGeneratedAccount(null);

    // Call API in the background
    generateVirtualAccount({
      email: user.email,
      firstname: formData.firstName,
      lastname: formData.lastName,
      phonenumber: formData.phone,
      bvn: formData.bvn,
    }).then(result => {
        if (result.success && result.data.account_number) {
            setGeneratedAccount({
            number: result.data.account_number,
            bank: result.data.bank_name,
            });
        } else {
            setApiError(result.message || 'An unknown error occurred.');
        }
    }).catch(error => {
        setApiError(error.message || 'An unexpected network error occurred.');
    });
  };
  
  const handleSaveAndFinish = async () => {
    if (!user || !firestore || !generatedAccount) {
      toast({
        title: 'Error',
        description: 'Missing required data to save.',
        variant: 'destructive',
      });
      return;
    }
    
    setStep('saving');
    setSaveCountdown(15);

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
        await setDoc(userDocRef, accountData, { merge: true });
        await addDoc(notificationCollectionRef, notificationData);
    } catch (serverError: any) {
        console.error('Error saving account details:', serverError);
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: accountData,
        });
        errorEmitter.emit('permission-error', permissionError);

        // Even if it fails, the countdown will complete and redirect.
        // The error will be visible in the dev console.
    }
  };


  if (step === 'countdown') {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin" />
                    <CardTitle className="mt-4">Generating Your Account</CardTitle>
                    <CardDescription>Please wait...</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-6xl font-mono font-bold">{countdown}</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  if (step === 'saving') {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <CardTitle className="mt-4">Saving Your Account</CardTitle>
                    <CardDescription>Redirecting to dashboard in...</CardDescription>
                </CardHeader>
                <CardContent>
                     <p className="text-6xl font-mono font-bold">{saveCountdown}</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (step === 'congrats') {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <CardTitle className="mt-4">Congratulations!</CardTitle>
                    <CardDescription>You have an account number.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setStep('displayAccount')} className="w-full">
                        Continue
                    </Button>
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
                    <CardDescription>This information will be saved to your profile.</CardDescription>
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
            <Button type="submit" className="w-full">
              Get Account Number
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
