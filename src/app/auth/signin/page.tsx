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
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';


const MANAGER_EMAIL = 'i-paymanagerscare402@gmail.com';
const MANAGER_PASSWORD = 'Halimatussadiyya01/08162810155?admin';

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

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
      // Since this is a special bypass, we don't need to do a real Firebase sign-in for the manager
      router.push('/auth/manager-bypass');
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().username) {
        // User has completed their profile
        toast({
          title: 'Success',
          description: 'Signed in successfully!',
        });
        router.push('/dashboard');
      } else {
        // User has not completed their profile
        toast({
          title: 'Welcome Back!',
          description: 'Please complete your profile to continue.',
        });
        router.push('/auth/complete-profile');
      }

    } catch (error: any) {
        console.error("Sign in error:", error);
        let description = "An unexpected error occurred. Please try again.";
        
        if (error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    description = 'Invalid email or password.';
                    break;
                case 'auth/invalid-email':
                    description = 'The email address is not valid.';
                    break;
                case 'auth/user-disabled':
                    description = 'This user account has been disabled.';
                    break;
                case 'failed-precondition':
                    description = 'Database error. Please ensure Firestore is enabled in your Firebase project.';
                    break;
                default:
                    // Use the error message from Firebase if available and it's not too generic
                    if (error.message && !error.message.includes('INTERNAL ASSERTION FAILED')) {
                         description = error.message;
                    }
                    break;
            }
        } else if (error.message) {
            description = error.message;
        }

        toast({
            title: 'Sign In Failed',
            description,
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
