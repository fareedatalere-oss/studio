'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { countries } from '@/lib/countries';
import { IPayLogo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ID } from 'appwrite';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  const [country, setCountry] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // If there's no user and we're not loading, they shouldn't be here.
    if (!userLoading && !user) {
        toast({
            title: 'Authentication Error',
            description: 'You need to sign up first.',
            variant: 'destructive',
        });
        router.replace('/auth/signup');
    }
  }, [user, userLoading, router, toast]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,5}$/.test(value)) {
      setPin(value);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: 'Error', description: 'User not found.', variant: 'destructive'});
        return;
    }

    if (!country || pin.length !== 5) {
      toast({
        title: 'Error',
        description: 'Country and a 5-digit PIN are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
        // Generate a temporary username from email. This will be updated later.
        const tempUsername = user.email.split('@')[0] + Math.floor(Math.random() * 1000);
        await account.updateName(tempUsername);

        // Prepare a complete data object that matches the database schema
        const profileData = {
            email: user.email,
            username: tempUsername,
            country: country,
            pin: pin,
            createdAt: new Date().toISOString(),
            firstName: "",
            lastName: "",
            middleName: "",
            phone: "",
            bvn: "",
            accountNumber: "",
            bankName: "",
            avatar: "",
            nairaBalance: 0,
            rewardBalance: 0,
            clickCount: 0,
            hasReferral: false,
        };

        // Create the new profile document using the user's ID as the document ID
        await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID_PROFILES,
            user.$id,
            profileData
        );
        
        toast({
            title: 'Profile Complete!',
            description: 'Welcome to I-Pay. You are now being redirected.',
        });

        router.push('/dashboard');

    } catch (error: any) {
        console.error("Profile setup error:", error);
        toast({
            title: 'Setup Failed',
            description: `A critical error occurred while creating your profile: ${error.message}`,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (userLoading || !user) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
              <Card className="w-full max-w-md">
                  <CardHeader>
                       <Skeleton className="h-8 w-48 mx-auto" />
                       <Skeleton className="h-4 w-64 mx-auto" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <IPayLogo className="mx-auto h-12 w-12" />
          <CardTitle className="mt-4 text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Just a few more details to get you set up.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSetup} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select onValueChange={setCountry} value={country} required>
                    <SelectTrigger id="country">
                        <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((c) => (
                            <SelectItem key={c.value} value={c.label}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">5-Digit Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={handlePinChange}
                maxLength={5}
                placeholder="e.g. 12345"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !country || pin.length !== 5}>
              {isLoading ? "Saving Profile..." : "Finish Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
