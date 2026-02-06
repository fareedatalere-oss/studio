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
import { account } from '@/lib/appwrite';


const MANAGER_EMAIL = 'i-paymanagerscare402@gmail.com';
const MANAGER_PASSWORD = 'Halimatussadiyya01/08162810155?admin';

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();

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

    if (email.toLowerCase() === MANAGER_EMAIL && password === MANAGER_PASSWORD) {
      toast({
        title: 'Manager Login Successful',
        description: 'Redirecting to security verification.',
      });
      router.push('/auth/manager-bypass');
      return;
    }
    
    try {
      await account.createEmailPasswordSession(email, password);

      // Successful sign-in, redirect immediately.
      toast({
        title: 'Success',
        description: 'Signed in successfully!',
      });
      router.push('/dashboard');

    } catch (error: any) {
        console.error("Sign in error:", error);
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (error.type === 'user_invalid_credentials' || error.code === 401) {
            errorMessage = "Invalid email or password.";
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
                type="email"
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
