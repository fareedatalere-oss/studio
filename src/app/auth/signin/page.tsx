
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
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/data-service';
import { Eye, EyeOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

/**
 * @fileOverview Sign In Page v3.0.
 * IDENTITY GATE: Prevents access if email is not verified.
 */

const ADMIN_EMAIL = 'ipatmanager17@gmail.com';
const ADMIN_PASS = 'Abdussalam@100';

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading, sendVerificationEmail } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (!userLoading && user && user.emailVerified) {
        router.replace('/dashboard');
    }
  }, [user, userLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsVerification(false);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. MASTER ADMIN BYPASS
      if (trimmedEmail === ADMIN_EMAIL && password === ADMIN_PASS) {
          await account.createEmailPasswordSession(email, password); 
          sessionStorage.setItem('ipay_admin_session', 'true');
          router.push('/manager/dashboard');
          return;
      }

      const res: any = await account.createEmailPasswordSession(email, password);
      const firebaseUser = res.user;

      // 2. IDENTITY GATE: Check Verification
      if (!firebaseUser.emailVerified) {
          setNeedsVerification(true);
          setIsLoading(false);
          toast({ 
            variant: 'destructive', 
            title: 'Email Not Verified', 
            description: 'Check your inbox for the activation link.' 
          });
          return;
      }

      const userId = firebaseUser.uid;

      try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        
        if (profile.isBlocked) {
            await account.deleteSession('current');
            toast({ 
                variant: 'destructive', 
                title: 'Access Denied', 
                description: 'You are blocked by I-Pay team.',
            });
            setIsLoading(false);
            return;
        }

        sessionStorage.setItem('ipay_pin_verified', 'true');
        router.push('/dashboard');
      } catch (profileError: any) {
        if (profileError.code === 404) {
            router.push('/auth/signup/profile');
        } else {
            router.push('/dashboard');
        }
      }

    } catch (error: any) {
        let message = "Invalid credentials. Please try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = "Account not found or wrong details.";
        }
        toast({ title: 'Sign In Failed', description: message, variant: 'destructive' });
        setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
        await sendVerificationEmail();
        toast({ title: 'Verification Sent', description: 'Please check your email again.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsLoading(false);
    }
  };

  if (userLoading) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary opacity-20" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl border-t-4 border-t-primary rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto inline-block p-1 mb-2">
            <IPayLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tighter uppercase">Welcome Back</CardTitle>
          <CardDescription className="font-bold text-xs uppercase opacity-60">Sign in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold uppercase text-[9px] opacity-70 tracking-widest pl-1">Email Address</Label>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl bg-muted/50 border-none px-4 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-bold uppercase text-[9px] opacity-70 tracking-widest pl-1">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="h-11 rounded-xl bg-muted/50 border-none px-4 pr-12 text-sm"
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground flex items-center justify-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {needsVerification && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-800 leading-tight">
                            Identity not activated. Click the link in your email to proceed.
                        </p>
                    </div>
                    <Button type="button" onClick={handleResend} variant="outline" size="sm" className="h-8 rounded-lg font-black uppercase text-[8px] gap-2 border-amber-200 text-amber-700 hover:bg-amber-100">
                        <RefreshCw className="h-3 w-3" /> Resend Activation Link
                    </Button>
                </div>
            )}

            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password"  className="text-[9px] font-black uppercase underline opacity-50 hover:opacity-100 transition-opacity">Forgot Password?</Link>
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl font-black uppercase tracking-widest shadow-lg mt-2 text-xs" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs font-medium uppercase tracking-tight">
            Don't have an account? <Link href="/auth/signup" className="underline font-black text-primary">Sign Up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
