
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';

/**
 * @fileOverview Sign In Page.
 * Robust Auth flow for Firebase migration.
 */

const MANAGER_EMAIL_1 = 'i-paymanagerscare402@gmail.com';
const MANAGER_PASSWORD_1 = 'Halimatussadiyya01/08162810155?admin';
const MANAGER_EMAIL_2 = 'ipatmanager17@gmail.com';
const MANAGER_PASSWORD_2 = 'Abdussalam@100';

const MASTER_ZIP_EMAIL = 'Myzip.com';
const MASTER_ZIP_PASS = '08162810155';

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      toast({
        title: "Install App",
        description: "Click your browser's menu (three dots) and select 'Add to Home Screen' or 'Install App' to download I-Pay.",
        duration: 5000
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const lowerCaseEmail = email.trim().toLowerCase();
    const isAdmin = lowerCaseEmail === MANAGER_EMAIL_1.toLowerCase() || lowerCaseEmail === MANAGER_EMAIL_2.toLowerCase();

    if (lowerCaseEmail === MASTER_ZIP_EMAIL.toLowerCase() && password === MASTER_ZIP_PASS) {
        toast({ title: 'Master Access Granted' });
        router.push('/auth/master-export');
        return;
    }

    if (!email || !password) {
      toast({ title: 'Error', description: 'Email and password are required.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (isAdmin) {
      if (password === MANAGER_PASSWORD_1 || password === MANAGER_PASSWORD_2) {
        toast({ title: 'Manager Access Verified' });
        router.push('/auth/manager-bypass');
        return;
      } else {
        toast({ title: 'Sign In Failed', description: 'Incorrect manager password.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }
    
    try {
      // 1. Authenticate with Firebase Auth
      const authResult = await account.createEmailPasswordSession(email, password);
      const userId = authResult.user.uid;

      // 2. Check if Profile exists in Firestore
      try {
        await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        
        // Success!
        toast({ title: 'Success', description: 'Signed in successfully!' });
        localStorage.setItem('ipay_last_active', Date.now().toString());
        sessionStorage.setItem('ipay_pin_verified', 'true');
        router.push('/dashboard');
      } catch (profileError: any) {
        // Auth account exists, but no profile doc. This is likely a half-finished migration signup.
        toast({ title: 'Profile Needed', description: 'Account found! Please complete your profile setup.' });
        router.push('/auth/signup/profile');
      }

    } catch (error: any) {
        console.error("Login error:", error);
        
        let message = "Invalid credentials. Please try again.";
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            message = "Account not found on the NEW system. Please Sign Up again to create your new credentials.";
        } else if (error.code === 'auth/wrong-password') {
            message = "Incorrect password for this email on the new system.";
        } else if (error.message?.includes('network')) {
            message = "Connection failed. Check your internet.";
        }

        toast({ 
            title: 'Sign In Failed', 
            description: message, 
            variant: 'destructive',
            duration: 8000
        });
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div 
            onClick={handleInstallClick} 
            className="mx-auto cursor-pointer hover:scale-110 transition-transform duration-300 active:scale-95 inline-block p-1"
            title="Force Install I-Pay"
          >
            <IPayLogo className="h-16 w-16" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="text" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password"  className="text-xs underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Signing In...' : 'Sign In'}</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account? <Link href="/auth/signup" className="underline font-bold text-primary">Sign Up (New System)</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
