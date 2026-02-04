'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';


export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(false);
  const [pinData, setPinData] = useState({ current: '', new: '' });
  const [emailData, setEmailData] = useState({ current: '', new: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '' });
  const [usernameData, setUsernameData] = useState({ current: '', new: '' });

  const handleUpdatePin = async () => {
    setIsLoading(true);
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      setIsLoading(false);
      return;
    }
    if (pinData.new.length !== 5 || !/^\d+$/.test(pinData.new)) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'New PIN must be 5 digits.' });
      setIsLoading(false);
      return;
    }
    if (pinData.current === pinData.new) {
        toast({ variant: 'destructive', title: 'No Change', description: 'New PIN cannot be the same as the current one.' });
        setIsLoading(false);
        return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists() || userDoc.data().pin !== pinData.current) {
        toast({
          variant: 'destructive',
          title: 'Incorrect Current PIN',
          description: 'The current PIN you entered is incorrect.',
        });
      } else {
        await updateDoc(userDocRef, { pin: pinData.new });
        toast({
          title: 'PIN Updated',
          description: 'Your transaction PIN has been successfully updated.',
        });
        setPinData({ current: '', new: '' });
      }
    } catch (error) {
      console.error("PIN Update Error:", error);
      toast({ variant: 'destructive', title: 'Error Updating PIN', description: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };


  const mockUpdate = (field: string, current: string, newValue: string) => {
    setIsLoading(true);
    // Simulate API call for other fields
    setTimeout(() => {
        toast({
          title: `${field.charAt(0).toUpperCase() + field.slice(1)} Updated (Simulated)`,
          description: `Your ${field} has been successfully updated.`,
        });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="container py-8">
      <Link href="/dashboard/profile" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pin">
              <AccordionTrigger>Change Transaction PIN</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="current-pin">Current PIN</Label>
                  <Input
                    id="current-pin"
                    type="password"
                    maxLength={5}
                    value={pinData.current}
                    onChange={(e) => setPinData({ ...pinData, current: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pin">New 5-Digit PIN</Label>
                  <Input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    value={pinData.new}
                    onChange={(e) => setPinData({ ...pinData, new: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <Button onClick={handleUpdatePin} disabled={isLoading || pinData.current.length !== 5 || pinData.new.length !== 5}>
                  {isLoading ? 'Updating...' : 'Update PIN'}
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="email">
              <AccordionTrigger>Change Email</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="current-email">Current Email</Label>
                  <Input
                    id="current-email"
                    type="email"
                    value={emailData.current}
                    onChange={(e) => setEmailData({ ...emailData, current: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">New Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={emailData.new}
                    onChange={(e) => setEmailData({ ...emailData, new: e.target.value })}
                  />
                </div>
                <Button onClick={() => mockUpdate('email', emailData.current, emailData.new)} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Email'}
                </Button>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="password">
              <AccordionTrigger>Change Password</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  />
                </div>
                <Button onClick={() => mockUpdate('password', passwordData.current, passwordData.new)} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="username">
              <AccordionTrigger>Change Username</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="current-username">Current Username</Label>
                  <Input
                    id="current-username"
                    value={usernameData.current}
                    onChange={(e) => setUsernameData({ ...usernameData, current: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-username">New Username</Label>
                  <Input
                    id="new-username"
                    value={usernameData.new}
                    onChange={(e) => setUsernameData({ ...usernameData, new: e.target.value })}
                  />
                </div>
                <Button onClick={() => mockUpdate('username', usernameData.current, usernameData.new)} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Username'}
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
