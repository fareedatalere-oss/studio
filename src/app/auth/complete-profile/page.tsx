'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/lib/countries';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [country, setCountry] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only accept alphabet letters
    if (/^[a-zA-Z]*$/.test(value)) {
      setUsername(value);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only accept 5 digits
    if (/^\d{0,5}$/.test(value)) {
      setPin(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country || !username || pin.length !== 5) {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill out all fields correctly. The PIN must be 5 digits.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    // Mock saving profile data
    setTimeout(() => {
      console.log('Saving profile:', { country, username, pin });
      toast({
        title: 'Profile Complete!',
        description: 'Welcome to your dashboard.',
      });
      router.push('/dashboard');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Just a few more details to get you started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select onValueChange={setCountry} value={country}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="e.g. johndoe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">5-Digit Transaction PIN</Label>
              <Input
                id="pin"
                type="text" // Using text to control length and pattern, but will show numeric keyboard on mobile with `inputMode`
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={handlePinChange}
                maxLength={5}
                placeholder="e.g. 12345"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Done'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
