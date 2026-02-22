'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedPin, setRetrievedPin] = useState<string | null>(null);

  const handleRetrieveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRetrievedPin(null); // Reset on new attempt

    if (!email) {
      toast({
        title: 'Error',
        description: 'Email is required.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    try {
        // WARNING: This is a highly insecure feature. It queries user data based on
        // an email and displays a sensitive PIN. This should not be used in a real application.
        // This also requires an index on the 'email' attribute in your Appwrite 'profiles' collection.
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_PROFILES,
            [Query.equal('email', email.trim().toLowerCase())]
        );

        if (response.documents.length > 0) {
            const profile = response.documents[0];
            if (profile.pin) {
                setRetrievedPin(profile.pin);
                toast({
                    title: 'PIN Retrieved',
                    description: 'Your PIN is displayed below. Passwords are encrypted and cannot be shown.',
                });
            } else {
                 toast({
                    title: 'PIN Not Found',
                    description: 'A profile was found, but it does not have a PIN set.',
                    variant: 'destructive',
                });
            }
        } else {
             toast({
                title: 'Not Found',
                description: 'No account was found with that email address.',
                variant: 'destructive',
            });
        }

    } catch (error: any) {
        console.error("Forgot password error:", error);
         toast({
            title: 'An Error Occurred',
            description: 'Could not retrieve information. Please ensure the email is correct and try again.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <IPayLogo className="mx-auto h-12 w-12" />
          <CardTitle className="mt-4 text-2xl font-bold">Retrieve Your PIN</CardTitle>
          <CardDescription>
            Enter your email to retrieve your transaction PIN. Passwords cannot be shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRetrieveInfo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Retrieving...' : 'Retrieve PIN'}
            </Button>
          </form>

          {retrievedPin && (
              <Alert variant="destructive" className="mt-4">
                <KeyRound className="h-4 w-4" />
                <AlertTitle>Your Transaction PIN</AlertTitle>
                <AlertDescription className="font-mono text-lg font-bold">
                  {retrievedPin}
                </AlertDescription>
              </Alert>
            )}

          <div className="mt-4 text-center text-sm">
            Remembered your password?{' '}
            <Link href="/auth/signin" className="underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
