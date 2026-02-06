'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { generateVirtualAccount } from '@/app/actions/flutterwave';
import { databases } from '@/lib/appwrite';

const COLLECTION_ID_PROFILES = 'profiles';

export default function GetAccountNumberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bvn: '',
    phone: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedAccount, setGeneratedAccount] = useState<{ number: string; bank: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'phone' || id === 'bvn') {
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [id]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Could not find user details. Please sign in again.',
      });
      return;
    }

    setIsGenerating(true);

    try {
        const result = await generateVirtualAccount({
            email: user.email,
            firstname: formData.firstName,
            lastname: formData.lastName,
            phonenumber: formData.phone,
            bvn: formData.bvn,
        });

        if (result.success && result.data.account_number) {
            const accountInfo = {
                number: result.data.account_number,
                bank: result.data.bank_name,
            };
            setGeneratedAccount(accountInfo);
            await handleSaveAndFinish(accountInfo);
        } else {
            throw new Error(result.message || 'An unknown error occurred while generating the account.');
        }
    } catch (error: any) {
         toast({
          variant: 'destructive',
          title: 'Account Generation Failed',
          description: error.message || 'We could not generate your account number. Please try again.',
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleSaveAndFinish = async (account: { number: string; bank: string }) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Critical Error",
        description: "Could not save account due to missing data. Please try again.",
      });
      return;
    }
    
    setIsSaving(true);
    
    const accountData = {
        accountNumber: account.number,
        bankName: account.bank,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        bvn: formData.bvn,
    };

    try {
        await databases.updateDocument(COLLECTION_ID_PROFILES, user.$id, accountData);
        toast({
            title: "Account Saved!",
            description: "Your new account details are saved to your profile.",
        });
        router.push('/dashboard');
    } catch (serverError: any) {
        console.error("Account save failed:", serverError);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: serverError.message || "Your account details could not be saved. Please try again.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="container py-8">
      <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Generate Account Number</CardTitle>
          <CardDescription>
            Provide your details to generate a new permanent account number. Your email is {user?.email || 'loading...'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bvn">NIN/BVN (11 digits)</Label>
              <Input id="bvn" value={formData.bvn} onChange={handleChange} required maxLength={11} minLength={11} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
            </div>
            <Button type="submit" className="w-full" disabled={isGenerating || isSaving}>
              {isGenerating || isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGenerating ? 'Generating...' : 'Saving...'}
                </>
              ) : 'Get Account Number'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
