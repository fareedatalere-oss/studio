'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader } from 'lucide-react';
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
    middleName: '',
    lastName: '',
    ninBvn: '',
    phone: '',
  });

  const [step, setStep] = useState<'form' | 'countdown'>('form');
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (step === 'countdown') {
      if (countdown <= 0) {
        router.push('/dashboard');
        return;
      }
      const timerId = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [step, countdown, router]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'phone' || id === 'ninBvn') {
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [id]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.email || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Could not find user details. Please sign in again.',
      });
      return;
    }

    // Start countdown immediately
    setStep('countdown');

    // Run account generation in the background (fire and forget)
    (async () => {
        try {
            const result = await generateVirtualAccount({
                email: user.email,
                firstname: formData.firstName,
                lastname: formData.lastName,
                phonenumber: formData.phone,
                bvn: formData.ninBvn,
            });

            if (result.success && result.data.account_number) {
                const userDocRef = doc(firestore, 'users', user.uid);
                const notificationCollectionRef = collection(firestore, 'users', user.uid, 'notifications');
                
                const accountData = {
                accountNumber: result.data.account_number,
                bankName: result.data.bank_name,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                bvn: formData.ninBvn,
                };

                // Save to database
                await setDoc(userDocRef, accountData, { merge: true });
                
                // Create notification
                await addDoc(notificationCollectionRef, {
                    title: 'Account Generated!',
                    description: `Your new ${result.data.bank_name} account number is ${result.data.account_number}. You can now fund this account.`,
                    type: 'system',
                    isRead: false,
                    createdAt: serverTimestamp(),
                });
                
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Account Generation Failed',
                    description: result.message || 'We could not generate your account number in the background.',
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'An Error Occurred',
                description: error.message || 'An unexpected error occurred during account generation.',
            });
        }
    })();
  };
  
  if (step === 'countdown') {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <Loader className="mx-auto h-16 w-16 text-primary animate-spin" />
                    <CardTitle className="mt-4">Account Generation in Progress</CardTitle>
                    <CardDescription>Your new account is being created. Please wait.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="p-4 bg-muted rounded-lg">
                        <Label>Redirecting to dashboard in</Label>
                        <p className="text-4xl font-bold font-mono tracking-wider">{countdown}</p>
                    </div>
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
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" value={formData.middleName} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ninBvn">NIN/BVN (11 digits)</Label>
              <Input id="ninBvn" value={formData.ninBvn} onChange={handleChange} required maxLength={11} minLength={11} />
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
