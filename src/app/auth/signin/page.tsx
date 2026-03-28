
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
import { useUser } from '@/hooks/use-appwrite';


const MANAGER_EMAIL_1 = 'i-paymanagerscare402@gmail.com';
const MANAGER_PASSWORD_1 = 'Halimatussadiyya01/08162810155?admin';
const MANAGER_EMAIL_2 = 'ipatmanager17@gmail.com';
const MANAGER_PASSWORD_2 = 'Abdussalam@100';

// MASTER ZIP BYPASS CREDENTIALS
const MASTER_ZIP_EMAIL = 'Myzip.com';
const MASTER_ZIP_PASS = '08162810155';


export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { recheckUser, proof } = useUser();

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

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        toast({ title: "Installing...", description: "I-Pay is being added to your device." });
      }
    } else {
      toast({ 
        title: "Install Not Detected", 
        description: "App may already be installed. Use 'Add to Home Screen' in browser settings if not.",
        duration: 5000
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const lowerCaseEmail = email.trim().toLowerCase();
    const isAdmin = lowerCaseEmail === MANAGER_EMAIL_1.toLowerCase() || lowerCaseEmail === MANAGER_EMAIL_2.toLowerCase();

    // 1. MASTER ZIP BYPASS CHECK
    if (lowerCaseEmail === MASTER_ZIP_EMAIL.toLowerCase() && password === MASTER_ZIP_PASS) {
        toast({ title: 'Master Access Granted', description: 'Redirecting to complete project export.' });
        router.push('/auth/master-export');
        return;
    }

    // 2. Master Switch Check
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

    // 3. Admin Redirect Check
    if (isAdmin) {
      if (password === MANAGER_PASSWORD_1 || password === MANAGER_PASSWORD_2) {
        toast({ title: 'Manager Login Successful', description: 'Redirecting to security verification.' });
        router.push('/auth/manager-bypass');
        return;
      } else {
        toast({ title: 'Sign In Failed', description: 'Incorrect manager password.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }
    
    try {
      await account.deleteSession('current').catch(() => {});
      const session = await account.createEmailPasswordSession(email, password);
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, session.userId);
      if (profile.isBanned) {
        await account.deleteSession('current');
        toast({ title: 'Account Suspended', description: 'Sorry, your account is currently suspended.', variant: 'destructive', duration: 7000 });
        setIsLoading(false);
        return;
      }
      await recheckUser();
      toast({ title: 'Success', description: 'Signed in successfully!' });
      router.push('/dashboard');
    } catch (error: any) {
        if (error.code === 404 && error.message.includes('document')) {
          router.push('/auth/signup/profile');
          return;
        }
        toast({ title: 'Sign In Failed', description: error.message || "Invalid credentials", variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div 
            onClick={handleInstallApp} 
            className="mx-auto cursor-pointer hover:scale-110 transition-transform duration-300 active:scale-95 inline-block p-1"
            title="Click to Install I-Pay"
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
            Don't have an account? <Link href="/auth/signup" className="underline">Sign Up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
