
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';
import { account, ID } from '@/lib/data-service';
import { Eye, EyeOff, ShieldCheck, Loader2, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

/**
 * @fileOverview Sign Up Page v2.0.
 * IDENTITY GATE: Automatically triggers email verification on creation.
 */

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading, sendVerificationEmail } = useUser();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  useEffect(() => {
    if (!userLoading && user && user.emailVerified) {
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

    setIsLoading(true);

    try {
      await account.create(ID.unique(), email, password);
      await account.createEmailPasswordSession(email, password);
      
      // IDENTITY GATE: Send verification link immediately
      await sendVerificationEmail();
      
      setIsVerificationSent(true);
      toast({ 
        title: 'Check Your Email', 
        description: "We've sent a verification link. Please click it to activate your account.",
        duration: 10000
      });
      
    } catch (error: any) {
      let msg = error.message || 'An unexpected error occurred.';
      if (error.code === 409 || error.code === 'auth/email-already-in-use') {
          msg = "Email already registered. Sign In instead.";
      }
      toast({ title: 'Sign Up Failed', description: msg, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  if (isVerificationSent) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl border-t-8 border-t-primary rounded-[2.5rem] overflow-hidden text-center p-10">
                <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                    <MailCheck className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-3xl font-black uppercase tracking-tighter mb-4">Verify Identity</CardTitle>
                <CardDescription className="text-sm font-bold leading-relaxed mb-8">
                    A secure activation link has been sent to <span className="text-primary">{email}</span>. <br/><br/>
                    Please click the link in your email to enable your I-Pay dashboard.
                </CardDescription>
                <Button asChild className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl">
                    <Link href="/auth/signin">Go to Sign In</Link>
                </Button>
                <p className="mt-6 text-[10px] font-black uppercase opacity-30 tracking-widest">Powered by I-Pay Security Engine</p>
            </Card>
        </div>
      );
  }

  if (userLoading) {
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
              {isLoading ? "Generating Link..." : "Create & Verify Email"}
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
