'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ClipboardCopy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateVirtualAccount } from '@/app/actions/flutterwave';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, Query } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

export default function GetAccountNumberPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: userLoading, recheckUser } = useUser();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    bvn: '',
    phone: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAccount, setGeneratedAccount] = useState<{ number: string; bank: string } | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    if (user) {
      databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id)
        .then(profile => {
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: profile.phone || '',
            bvn: profile.bvn || '',
          }));
        })
        .catch(error => {
          setFormData(prev => ({ ...prev, email: user.email }));
        })
        .finally(() => {
            setIsPageLoading(false);
        });
    } else if (!userLoading) {
        setIsPageLoading(false);
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (generatedAccount && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (generatedAccount && countdown === 0) {
      router.push('/dashboard');
    }
  }, [generatedAccount, countdown, router]);
  

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
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    
    if (!formData.firstName || !formData.lastName || !formData.bvn || !formData.phone) {
      toast({
        variant: 'destructive',
        title: 'All Fields Required',
        description: 'Please fill out all the details.',
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

            await account.updateName(`${formData.firstName} ${formData.lastName}`);
            
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_PROFILES,
                user.$id,
                {
                    accountNumber: accountInfo.number,
                    bankName: accountInfo.bank,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    bvn: formData.bvn,
                }
            );

            await recheckUser();
            setGeneratedAccount(accountInfo);
            toast({ title: "Account Generated!" });
        } else {
            throw new Error(result.message || 'Could not generate account. Please check your BVN/NIN.');
        }
    } catch (error: any) {
         toast({
          variant: 'destructive',
          title: 'Failed',
          description: error.message || 'Network error occurred.',
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  if (generatedAccount) {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-lg mx-auto rounded-[2.5rem]">
                <CardHeader>
                    <CardTitle className="text-center">Success!</CardTitle>
                    <CardDescription className="text-center">
                        Redirecting in {countdown}s...
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-6 bg-primary/5 rounded-3xl text-center">
                        <Label className="uppercase text-[10px] font-black opacity-50">Account Number</Label>
                        <p className="font-black text-2xl tracking-tighter">{generatedAccount.number}</p>
                        <p className="text-sm font-bold text-primary">{generatedAccount.bank}</p>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedAccount.number)} className="mt-2 h-8 rounded-full">
                            <ClipboardCopy className="h-3 w-3 mr-2" /> Copy
                        </Button>
                    </div>
                    <Button asChild className="w-full h-14 rounded-full font-black uppercase">
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container py-8">
      <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm font-black uppercase">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Card className="w-full max-w-lg mx-auto rounded-[2.5rem]">
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tighter">Identity Check</CardTitle>
          <CardDescription className="font-bold">Provide your real details for Flutterwave verification.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPageLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin" /></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-50">First Name</Label><Input id="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-50">Last Name</Label><Input id="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase opacity-50">NIN/BVN (11 digits)</Label>
                    <Input id="bvn" value={formData.bvn} onChange={handleChange} required maxLength={11} minLength={11} className="font-mono text-lg" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase opacity-50">Phone Number</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required className="font-mono text-lg" />
                </div>
                <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl mt-4" disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</> : 'Get Account Number'}
                </Button>
            </form>
           )}
        </CardContent>
      </Card>
    </div>
  );
}