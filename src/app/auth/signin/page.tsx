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
import { Eye, EyeOff } from 'lucide-react';

/**
 * @fileOverview Sign In Page.
 * Robust Auth flow for Firebase migration with password visibility.
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
  const [showPassword, setShowPassword] = useState(false);
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
      const userId = (authResult as any).user.uid;

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
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8">
          <div 
            onClick={handleInstallClick} 
            className="mx-auto cursor-pointer hover:scale-110 transition-transform duration-300 active:scale-95 inline-block p-1 mb-4"
            title="Force Install I-Pay"
          >
            <IPayLogo className="h-16 w-16" />
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-tighter">Welcome Back</CardTitle>
          <CardDescription className="font-bold">Sign in to your Firebase account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-[10px] opacity-70">Email Address</Label>
              <Input id="email" type="text" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none px-4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold uppercase text-[10px] opacity-70">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="h-12 rounded-xl bg-muted/50 border-none px-4 pr-12"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password"  className="text-[10px] font-black uppercase underline opacity-50 hover:opacity-100 transition-opacity">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-2" disabled={isLoading}>{isLoading ? 'Signing In...' : 'Sign In'}</Button>
          </form>
          <div className="mt-6 text-center text-sm font-medium">
            Don't have an account? <Link href="/auth/signup" className="underline font-black text-primary">Sign Up (New System)</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
