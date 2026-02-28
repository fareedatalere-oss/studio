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
import { ID } from 'appwrite';
import { useUser } from '@/hooks/use-appwrite';

const MANAGER_EMAILS = ['i-paymanagerscare402@gmail.com', 'ipatmanager17@gmail.com'];

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { recheckUser, proof } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const lowerCaseEmail = email.trim().toLowerCase();
    const isAdmin = MANAGER_EMAILS.includes(lowerCaseEmail);

    // Master Switch Check
    if (proof && !proof.main_switch && !isAdmin) {
        toast({ variant: 'destructive', title: "App Offline", description: "I-pay app isn't available kindly try again later" });
        setIsLoading(false);
        return;
    }

    if (!email || !password) {
      toast({ title: 'Error', description: 'Email and password are required.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    
    if (isAdmin) {
      toast({ title: 'Reserved Email', description: 'This email is reserved for administrators.', variant: 'destructive' });
       setIsLoading(false);
      return;
    }

    try {
      await account.deleteSession('current').catch(() => {});
      await account.create(ID.unique(), email, password);
      await account.createEmailPasswordSession(email, password);
      await recheckUser();
      toast({ title: 'Account Created!', description: "Next, complete your profile." });
      router.push('/auth/signup/profile');
    } catch (error: any) {
      toast({ title: 'Sign Up Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-md">
        <CardHeader className="text-center">
          <IPayLogo className="mx-auto h-12 w-12" />
          <CardTitle className="mt-4 text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Provide your email and password to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="text" 
                placeholder="m@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isLoading} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
              {isLoading ? "Creating Account..." : "Continue"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account? <Link href="/auth/signin" className="underline">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
