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

  const [username, setUsername] = useState('');
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

    if (!username || !country || pin.length !== 5) {
      toast({
        title: 'Error',
        description: 'All fields are required and PIN must be 5 digits.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
        // Check if a profile already exists to prevent errors.
        try {
            await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);
            // If getDocument succeeds, a profile already exists.
            toast({
                title: 'Profile Already Exists',
                description: 'Redirecting you to the dashboard.',
            });
            router.push('/dashboard');
            setIsLoading(false);
            return;
        } catch (error: any) {
            // A 404 error is expected if the profile doesn't exist, so we can proceed.
            if (error.code !== 404) {
                throw error; // Re-throw unexpected errors.
            }
        }
        
        // Update the user's name in the Appwrite auth system
        await account.updateName(username);

        // Prepare the complete data for the new user's profile document
        const profileData = {
            uid: user.$id,
            email: user.email,
            username: username,
            country: country,
            pin: pin,
            nairaBalance: 0,
            rewardBalance: 0,
            clickCount: 0,
            avatar: '',
            hasReferral: null,
            // Initialize other fields to avoid null issues later
            firstName: '',
            lastName: '',
            middleName: '',
            phone: '',
            bvn: '',
            accountNumber: '',
            bankName: '',
        };

        // Create the new profile document
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
            description: error.message || 'We could not save your profile. This might be due to a network issue or an existing username.',
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="e.g., johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
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
            <Button type="submit" className="w-full" disabled={isLoading || !username || !country || pin.length !== 5}>
              {isLoading ? "Saving Profile..." : "Finish Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
