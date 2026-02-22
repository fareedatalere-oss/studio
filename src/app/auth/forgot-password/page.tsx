'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRetrieveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    // This feature is insecure and has been disabled from the public page.
    // The functionality was moved to the admin panel as per the new request.
    toast({
      title: 'Feature Disabled',
      description: 'For security, password and PIN recovery is handled by administrators. Please contact support if you have lost your credentials.',
      variant: 'destructive',
      duration: 7000,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <IPayLogo className="mx-auto h-12 w-12" />
          <CardTitle className="mt-4 text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Password recovery is handled by support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRetrieveInfo} className="space-y-4">
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
              {isLoading ? 'Processing...' : 'Request Reset'}
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
