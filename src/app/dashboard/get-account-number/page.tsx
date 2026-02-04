'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // Allow only numbers for phone and bvn
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
    setIsLoading(true);

    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Could not find user email. Please sign in again.',
      });
      setIsLoading(false);
      return;
    }

    const result = await generateVirtualAccount({
      email: user.email,
      firstname: formData.firstName,
      lastname: formData.lastName,
      phonenumber: formData.phone,
      bvn: formData.ninBvn,
    });
    
    if (result.success && result.data.account_number) {
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            const notificationCollectionRef = collection(firestore, 'users', user.uid, 'notifications');

            // Save account details to user profile
            await setDoc(userDocRef, {
                accountNumber: result.data.account_number,
                bankName: result.data.bank_name,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                bvn: formData.ninBvn,
            }, { merge: true });
            
            // Create notification
            await addDoc(notificationCollectionRef, {
                title: 'Account Generated!',
                description: `Your new ${result.data.bank_name} account number is ${result.data.account_number}.`,
                type: 'system',
                isRead: false,
                createdAt: serverTimestamp(),
            });

            toast({
                title: 'Success!',
                description: 'A valid account number has been generated.',
            });
            router.push(`/dashboard`);

        } catch (error) {
            console.error("Error saving account details:", error);
            toast({
                variant: 'destructive',
                title: 'Database Error',
                description: 'Could not save your new account details. Please try again.',
            });
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'Failed to Generate Account',
            description: result.message || 'An error occurred while generating the account number.',
        });
    }

    setIsLoading(false);
  };

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
              <Input id="ninBvn" value={formData.ninBvn} onChange={handleChange} required pattern="\\d{11}" maxLength={11} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Get Account Number'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
