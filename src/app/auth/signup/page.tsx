'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { ID } from 'appwrite';

const MANAGER_EMAIL = 'i-paymanagerscare402@gmail.com';

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,5}$/.test(value)) {
        setPin(value);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password || pin.length !== 5) {
      toast({
        title: 'Error',
        description: 'Email, password, and a 5-digit PIN are required.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
       setIsLoading(false);
      return;
    }


    if (email.toLowerCase() === MANAGER_EMAIL) {
      toast({
        title: 'Email Already Exists',
        description: 'This email address is not available for sign up.',
        variant: 'destructive',
      });
       setIsLoading(false);
      return;
    }

    try {
      // Before creating a new account, we must ensure no old session is active.
      await account.deleteSession('current').catch(() => {
        // Ignore error if no session exists
        console.log("No active session found. Proceeding with signup.");
      });

      // Create the user account
      const newUser = await account.create(ID.unique(), email, password);
      
      // Explicitly create a session to ensure it's active before the redirect.
      await account.createEmailPasswordSession(email, password);
      
      // Create the profile document in the database
      const profileData = {
          email: email,
          pin: pin,
          username: email.split('@')[0], // A default username
          createdAt: new Date().toISOString(),
      };

      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID_PROFILES,
        newUser.$id,
        profileData
      );

      toast({
          title: 'Account Created!',
          description: "Welcome to I-Pay. You are now logged in.",
      });

      // Instantly redirect as commanded.
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Sign up error:", error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.type === 'user_already_exists') {
        description = 'This email address is already in use by another account.';
      } else if (error.type === 'user_password_invalid') {
        description = 'The password must be at least 8 characters long.';
      }
      toast({
        title: 'Sign Up Failed',
        description: error.message || description,
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
          <CardTitle className="mt-4 text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Provide your email, password, and transaction PIN.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="pin">5-Digit Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={handlePinChange}
                maxLength={5}
                placeholder="e.g. 12345"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !email || !password || pin.length !== 5}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/signin" className="underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
