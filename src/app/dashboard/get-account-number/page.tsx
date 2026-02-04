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
    if (id === 'phone' || id === 'ninBvn') {
        if (/^\d*$/.test(value)) {
             setFormData((prev) => ({ ...prev, [id]: value }));
        }
    } else {
        setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    toast({
        title: 'Success!',
        description: 'Your account is being generated and will appear on the dashboard.',
    });
    router.push(`/dashboard`);

    // Perform generation and database updates in the background
    generateVirtualAccount({
      email: user.email,
      firstname: formData.firstName,
      lastname: formData.lastName,
      phonenumber: formData.phone,
      bvn: formData.ninBvn,
    }).then(result => {
        if (result.success && result.data.account_number) {
            if (!firestore || !user) return;
            const userDocRef = doc(firestore, 'users', user.uid);
            const notificationCollectionRef = collection(firestore, 'users', user.uid, 'notifications');

            setDoc(userDocRef, {
                accountNumber: result.data.account_number,
                bankName: result.data.bank_name,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                bvn: formData.ninBvn,
            }, { merge: true });
            
            addDoc(notificationCollectionRef, {
                title: 'Account Generated!',
                description: `Your new ${result.data.bank_name} account number is ${result.data.account_number}.`,
                type: 'system',
                isRead: false,
                createdAt: serverTimestamp(),
            });
        } else {
            console.error("Failed to generate account in background:", result.message);
            // Optionally, create a failure notification for the user
            if (firestore && user) {
                 const notificationCollectionRef = collection(firestore, 'users', user.uid, 'notifications');
                 addDoc(notificationCollectionRef, {
                    title: 'Account Generation Failed',
                    description: result.message || 'We could not generate your account number at this time.',
                    type: 'system',
                    isRead: false,
                    createdAt: serverTimestamp(),
                });
            }
        }
    }).catch(error => {
        console.error("Error generating virtual account:", error);
    });
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
              {isLoading ? 'Processing...' : 'Get Account Number'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
