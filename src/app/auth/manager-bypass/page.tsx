'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const MANAGER_BYPASS_CODE = 'Ipay0816210155#';

export default function ManagerBypassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [bypassCode, setBypassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (bypassCode === MANAGER_BYPASS_CODE) {
      toast({
        title: 'Access Granted',
        description: 'Welcome to the Manager Dashboard.',
      });
      router.push('/manager/dashboard');
    } else {
      toast({
        title: 'Access Denied',
        description: 'The bypass code is incorrect.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Manager Security Check</CardTitle>
          <CardDescription>Please enter the bypass code to proceed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Warning: Restricted Area</AlertTitle>
            <AlertDescription>
              This area is for authorized managers only. If you have arrived here by mistake, please do not proceed. Contact{' '}
              <Link href="/dashboard/profile/support" className="underline">
                support
              </Link>{' '}
              if you believe this is an error.
            </AlertDescription>
          </Alert>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bypass-code">Manager Bypass Code</Label>
              <Input
                id="bypass-code"
                type="password"
                value={bypassCode}
                onChange={(e) => setBypassCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Enter Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
