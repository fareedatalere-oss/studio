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
import { account, ID } from '@/lib/data-service';
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

/**
 * @fileOverview Sign Up Page.
 * REDIRECT: Auto-redirects if already authenticated.
 */

const MANAGER_EMAILS = ['i-paymanagerscare402@gmail.com', 'ipatmanager17@gmail.com'];

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // REDIRECT FORCE: Prevent landing on Sign Up while logged in
  useEffect(() => {
    if (!userLoading && user) {
        router.replace('/dashboard');
    }
  }, [user, userLoading, router]);

  const passwordsMatch = password === confirmPassword && password.length >= 6;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: 'Validation Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Validation Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    const lowerCaseEmail = email.trim().toLowerCase();
    const isAdmin = MANAGER_EMAILS.includes(lowerCaseEmail);

    if (!email || !password) {
      toast({ title: 'Error', description: 'Email and password are required.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    
    if (isAdmin) {
      toast({ title: 'Reserved Email', description: 'Reserved for administrators.', variant: 'destructive' });
       setIsLoading(false);
      return;
    }

    try {
      await account.create(ID.unique(), email, password);
      await account.createEmailPasswordSession(email, password);
      
      localStorage.setItem('ipay_last_active', Date.now().toString());
      sessionStorage.setItem('ipay_pin_verified', 'true');
      
      toast({ title: 'Account Created!', description: "Setup your profile now." });
      router.push('/auth/signup/profile');
    } catch (error: any) {
      let msg = error.message || 'An unexpected error occurred.';
      if (error.code === 409) {
          msg = "Email already registered. Sign In instead.";
      }
      toast({ title: 'Sign Up Failed', description: msg, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  if (userLoading || user) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary opacity-20" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8">
          <IPayLogo className="mx-auto h-16 w-16 mb-4" />
          <CardTitle className="text-3xl font-black uppercase tracking-tighter">Create Account</CardTitle>
          <CardDescription className="font-bold">Join the new I-pay online world today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-[10px] opacity-70">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isLoading} 
                className="h-12 rounded-xl bg-muted/50 border-none px-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold uppercase text-[10px] opacity-70">Create Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLoading} 
                  className="h-12 rounded-xl bg-muted/50 border-none px-4 pr-12"
                  placeholder="At least 6 characters"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-bold uppercase text-[10px] opacity-70">Confirm Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  disabled={isLoading} 
                  className={cn(
                    "h-12 rounded-xl bg-muted/50 border-none px-4 pr-12",
                    confirmPassword && !passwordsMatch && "ring-2 ring-destructive"
                  )}
                  placeholder="Re-enter password"
                />
                {passwordsMatch && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              {confirmPassword && !passwordsMatch && password.length >= 6 && (
                <p className="text-[10px] text-destructive font-bold uppercase">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-4" disabled={isLoading || !passwordsMatch}>
              {isLoading ? "Creating Account..." : "Continue"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm font-medium">
            Already have an account? <Link href="/auth/signin" className="underline font-black text-primary">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
