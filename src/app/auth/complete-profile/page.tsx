'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/lib/countries';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateVirtualAccount } from '@/app/actions/flutterwave';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [formData, setFormData] = useState({
    country: '',
    username: '',
    pin: '',
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    bvn: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    // If not loading and no user is found, they shouldn't be here.
    if (!userLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign up or sign in first.',
        variant: 'destructive',
      });
      router.replace('/auth/signup');
    }
  }, [user, userLoading, router, toast]);

  // Effect for the countdown timer
  useEffect(() => {
    if (isProcessing) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isProcessing]);

  // Effect for the redirect
  useEffect(() => {
    if (countdown === 0) {
      router.push('/dashboard');
    }
  }, [countdown, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
     if (id === 'pin') {
      if (/^\d{0,5}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [id]: value }));
      }
    } else if (id === 'bvn') {
        if (/^\d{0,11}$/.test(value)) {
            setFormData((prev) => ({ ...prev, [id]: value }));
        }
    } else if (id === 'phone') {
        if (/^\d*$/.test(value)) {
            setFormData((prev) => ({ ...prev, [id]: value }));
        }
    } else {
        setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, country: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      toast({ title: 'Not authenticated', description: 'No user is signed in.', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true); // Start the countdown UI

    try {
      // 1. Save the initial profile data (excluding account number)
      const userDocRef = doc(firestore, 'users', user.uid);
      const initialProfileData = {
        username: formData.username,
        country: formData.country,
        pin: formData.pin, // In a real app, this should be handled more securely (e.g., hashing).
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        phone: formData.phone,
        bvn: formData.bvn,
      };
      await setDoc(userDocRef, initialProfileData, { merge: true });
      
      // 2. Call Flutterwave to generate the virtual account
      const accountResult = await generateVirtualAccount({
        email: user.email,
        firstname: formData.firstName,
        lastname: formData.lastName,
        phonenumber: formData.phone,
        bvn: formData.bvn,
      });

      if (!accountResult.success || !accountResult.data) {
        throw new Error(accountResult.message || 'Failed to generate account number from payment provider.');
      }

      // 3. Save the new account number back to Firestore
      const finalProfileData = {
        accountNumber: accountResult.data.account_number,
        bankName: accountResult.data.bank_name,
      };
      await setDoc(userDocRef, finalProfileData, { merge: true });

      // If we reach here, everything succeeded. The countdown is already running.
      // The redirect will happen automatically when the countdown finishes.

    } catch (error: any) {
        console.error("Profile completion error:", error);
        toast({
            title: 'An Error Occurred',
            description: error.message || 'Could not complete your profile. Please try again.',
            variant: 'destructive',
        });
        setIsProcessing(false); // Stop countdown and show form again on error
        setCountdown(30); // Reset countdown
    }
  };

  if (userLoading) {
      return null;
  }
  
  if (isProcessing) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Setting up your account...</CardTitle>
                    <CardDescription>Please wait while we finalize your details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-6xl font-bold font-mono text-primary">
                        {countdown}
                    </div>
                    <p className="text-muted-foreground mt-2">Redirecting to your dashboard shortly.</p>
                </CardContent>
            </Card>
       </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Just a few more details to get you started.</CardDescription>
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
                <Label htmlFor="middleName">Middle Name (Optional)</Label>
                <Input id="middleName" value={formData.middleName} onChange={handleChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select onValueChange={handleSelectChange} value={formData.country} required>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. johndoe"
                required
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="bvn">NIN/BVN (11 digits)</Label>
                <Input id="bvn" value={formData.bvn} onChange={handleChange} required maxLength={11} minLength={11} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">5-Digit Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.pin}
                onChange={handleChange}
                maxLength={5}
                placeholder="e.g. 12345"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
