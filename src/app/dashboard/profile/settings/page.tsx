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
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';


export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [pinData, setPinData] = useState({ current: '', new: '' });
  const [emailData, setEmailData] = useState({ new: '', password: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '' });
  const [usernameData, setUsernameData] = useState({ new: '' });

  const handleUpdatePin = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);
        if (profile.pin !== pinData.current) {
            throw new Error("The current PIN is incorrect.");
        }
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { pin: pinData.new });
        toast({ title: 'PIN Updated', description: 'Your transaction PIN has been changed.' });
        setPinData({ current: '', new: '' });
    } catch(error: any) {
        toast({ title: 'Error Updating PIN', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleUpdateEmail = async () => {
    setIsLoading(true);
    try {
        await account.updateEmail(emailData.new, emailData.password);
        toast({ title: 'Email Update Requested', description: 'Please check your new email address to verify the change.' });
        setEmailData({ new: '', password: '' });
    } catch (error: any) {
        toast({ title: 'Error Updating Email', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setIsLoading(true);
    try {
        await account.updatePassword(passwordData.new, passwordData.current);
        toast({ title: 'Password Updated', description: 'Your password has been successfully updated.' });
        setPasswordData({ new: '', current: '' });
    } catch (error: any) {
        toast({ title: 'Error Updating Password', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleUpdateUsername = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        // Update name in Appwrite Auth
        await account.updateName(usernameData.new);
        
        // Also update username in our profiles collection
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { username: usernameData.new });
        
        toast({ title: 'Username Updated', description: 'Your username has been successfully updated.' });
        setUsernameData({ new: '' });
    } catch (error: any) {
        toast({ title: 'Error Updating Username', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
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
                  <Label htmlFor="new-email">New Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={emailData.new}
                    onChange={(e) => setEmailData({ ...emailData, new: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-password">Current Password</Label>
                  <Input
                    id="email-password"
                    type="password"
                    value={emailData.password}
                    onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                  />
                </div>
                <Button onClick={handleUpdateEmail} disabled={isLoading || !emailData.new || !emailData.password}>
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
                <Button onClick={handleUpdatePassword} disabled={isLoading || !passwordData.current || !passwordData.new}>
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="username">
              <AccordionTrigger>Change Username</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">New Username</Label>
                  <Input
                    id="new-username"
                    value={usernameData.new}
                    onChange={(e) => setUsernameData({ ...usernameData, new: e.target.value })}
                  />
                </div>
                <Button onClick={handleUpdateUsername} disabled={isLoading || !usernameData.new}>
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
