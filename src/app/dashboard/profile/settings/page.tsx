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

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [pinData, setPinData] = useState({ current: '', new: '' });
  const [emailData, setEmailData] = useState({ current: '', new: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '' });
  const [usernameData, setUsernameData] = useState({ current: '', new: '' });

  const mockUpdate = (field: string, current: string, newValue: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      // In a real app, you'd validate the 'current' value on the backend.
      // We'll mock a correct value for demonstration.
      const mockCurrentValues: { [key: string]: string } = {
        pin: '12345',
        email: 'johndoe@example.com',
        password: 'password123',
        username: 'johndoe',
      };

      if (current !== mockCurrentValues[field]) {
        toast({
          variant: 'destructive',
          title: `Incorrect Current ${field.charAt(0).toUpperCase() + field.slice(1)}`,
          description: 'The current value you entered is incorrect.',
        });
      } else {
        console.log(`Updating ${field} to:`, newValue);
        toast({
          title: `${field.charAt(0).toUpperCase() + field.slice(1)} Updated`,
          description: `Your ${field} has been successfully updated.`,
        });
      }
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
                    onChange={(e) => setPinData({ ...pinData, current: e.target.value })}
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
                    onChange={(e) => setPinData({ ...pinData, new: e.target.value })}
                  />
                </div>
                <Button onClick={() => mockUpdate('pin', pinData.current, pinData.new)} disabled={isLoading}>
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
