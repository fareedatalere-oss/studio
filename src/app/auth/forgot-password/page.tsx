'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';
import { account } from '@/lib/appwrite';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email) {
      toast({
        title: 'Error',
        description: 'Email is required.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    try {
        // Appwrite requires a URL to redirect to after password reset
        const resetUrl = `${window.location.origin}/auth/reset-password`;
        await account.createRecovery(email, resetUrl);
        toast({
            title: 'Check your email',
            description: 'A password reset link has been sent to your email address if it is associated with an account.',
        });
    } catch (error: any) {
        console.error("Forgot password error:", error);
        // We don't want to reveal if a user exists or not, so we show a generic success message regardless of error.
         toast({
            title: 'Check your email',
            description: 'If your email is in our system, you will receive a password reset link.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <IPayLogo className="mx-auto h-12 w-12" />
          <CardTitle className="mt-4 text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending Link...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Remembered your password?{' '}
            <Link href="/auth/signin" className="underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
