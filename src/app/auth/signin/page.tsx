
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
import { account } from '@/lib/appwrite';

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

    // 1. MASTER ZIP BYPASS CHECK
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

    // 2. Admin Redirect Check
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
      // Direct Auth Path - Bypass configuration middleman for stability
      await account.deleteSession('current').catch(() => {});
      await account.createEmailPasswordSession(email, password);
      
      toast({ title: 'Success', description: 'Signed in successfully!' });
      
      // Update activity and redirect
      localStorage.setItem('ipay_last_active', Date.now().toString());
      sessionStorage.setItem('ipay_pin_verified', 'true');
      router.push('/dashboard');
    } catch (error: any) {
        toast({ title: 'Sign In Failed', description: error.message || "Invalid credentials", variant: 'destructive' });
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
            title="Download I-Pay App"
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
