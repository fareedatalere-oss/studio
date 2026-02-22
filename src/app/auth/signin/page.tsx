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
import { useUser } from '@/hooks/use-appwrite';


const MANAGER_EMAIL_1 = 'i-paymanagerscare402@gmail.com';
const MANAGER_PASSWORD_1 = 'Halimatussadiyya01/08162810155?admin';
const MANAGER_EMAIL_2 = 'ipatmanager@17@gmail.com';
const MANAGER_PASSWORD_2 = 'Abdussalam@100';


export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { recheckUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const lowerCaseEmail = email.toLowerCase();

    if (
      (lowerCaseEmail === MANAGER_EMAIL_1 && password === MANAGER_PASSWORD_1) ||
      (lowerCaseEmail === MANAGER_EMAIL_2 && password === MANAGER_PASSWORD_2)
    ) {
      toast({
        title: 'Manager Login Successful',
        description: 'Redirecting to security verification.',
      });
      router.push('/auth/manager-bypass');
      return;
    }
    
    try {
      // Delete any existing session before trying to sign in.
      await account.deleteSession('current').catch(() => {
        // Ignore error if no session exists
        console.log("No active session to delete. Proceeding with signin.");
      });

      const session = await account.createEmailPasswordSession(email, password);
      
      // Force the provider to update its state with the new user
      await recheckUser();
      
      // Check if a profile document exists for this user.
      try {
        await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, session.userId);
        
        // Profile exists, so we can go to the dashboard.
        toast({
          title: 'Success',
          description: 'Signed in successfully!',
        });
        router.push('/dashboard');
      } catch (profileError: any) {
        // A 404 error means the profile document was not found.
        if (profileError.code === 404) {
          toast({
            title: 'Welcome!',
            description: "Please complete your profile to continue.",
          });
          router.push('/auth/signup/profile');
        } else {
          // For any other error, we should show it.
          throw profileError;
        }
      }

    } catch (error: any) {
        console.error("Sign in error:", error);
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (error.type === 'user_invalid_credentials' || error.code === 401) {
            errorMessage = "Invalid email or password.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        toast({
            title: 'Sign In Failed',
            description: errorMessage,
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
          <CardTitle className="mt-4 text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
            <div className="flex items-center justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="underline">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
