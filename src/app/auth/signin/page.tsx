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
import { Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * @fileOverview Sign In Page.
 * Branding: I-pay online world.
 */

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

    try {
      // 1. Authenticate
      const authRes = await account.createEmailPasswordSession(email, password);
      const userId = authRes.user.uid;

      // 2. Check Profile
      try {
        await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        
        sessionStorage.setItem('ipay_pin_verified', 'true');
        toast({ title: 'Signed In', description: 'Welcome back to I-pay online world.' });
        router.push('/dashboard');
      } catch (profileError: any) {
        // If account exists but profile doc is missing
        router.push('/auth/signup/profile');
      }

    } catch (error: any) {
        let message = "Invalid credentials. Please try again.";
        
        // Exact requirement: "this account isn't registered with this"
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            message = "This account isn't registered with this.";
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
          <div className="mx-auto inline-block p-1 mb-4">
            <IPayLogo className="h-16 w-16" />
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-tighter">Welcome Back</CardTitle>
          <CardDescription className="font-bold">Sign in to your I-pay online world account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-[10px] opacity-70">Email Address</Label>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none px-4" />
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
            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm font-medium">
            Don't have an account? <Link href="/auth/signup" className="underline font-black text-primary">Sign Up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}