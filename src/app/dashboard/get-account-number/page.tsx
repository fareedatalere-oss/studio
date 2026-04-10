
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateVirtualAccount } from '@/app/actions/flutterwave';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
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
        .catch(() => {
          setFormData(prev => ({ ...prev, email: user.email }));
        })
        .finally(() => {
            setIsPageLoading(false);
        });
    } else if (!userLoading) {
        setIsPageLoading(false);
    }
  }, [user, userLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'phone' || id === 'bvn') {
      if (/^\d*$/.test(value)) setFormData((prev) => ({ ...prev, [id]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsGenerating(true);
    toast({ title: 'Verifying with Flutterwave...' });

    try {
        const result = await generateVirtualAccount({
            email: user.email, 
            firstname: formData.firstName,
            lastname: formData.lastName,
            phonenumber: formData.phone,
            bvn: formData.bvn,
        });

        if (result.success && result.data.account_number) {
            const accNum = result.data.account_number;
            const bankName = result.data.bank_name;

            // SAVE PERMANENTLY TO PROFILE
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_PROFILES,
                user.$id,
                {
                    accountNumber: accNum,
                    bankName: bankName,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    bvn: formData.bvn,
                }
            );

            await recheckUser();
            setGeneratedAccount({ number: accNum, bank: bankName });
            toast({ title: "Account Active!" });
        } else {
            throw new Error(result.message || 'Verification failed. Ensure BVN/NIN is correct.');
        }
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
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
        <div className="container py-8 max-w-md">
            <Card className="rounded-[3rem] shadow-2xl border-none p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
                <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <CardHeader>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Verified!</CardTitle>
                    <CardDescription className="font-bold">Your virtual account is ready.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 mt-4">
                    <div className="p-6 bg-muted/50 rounded-[2rem] border-2 border-dashed">
                        <Label className="uppercase text-[9px] font-black opacity-50 tracking-widest mb-2 block">Incoming Bank Details</Label>
                        <p className="font-black text-2xl tracking-tighter">{generatedAccount.number}</p>
                        <p className="text-xs font-bold text-primary uppercase mt-1">{generatedAccount.bank}</p>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedAccount.number)} className="mt-4 h-8 rounded-full font-black uppercase text-[9px] gap-2">
                            <ClipboardCopy className="h-3 w-3" /> Copy
                        </Button>
                    </div>
                </CardContent>
                <Button asChild className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl">
                    <Link href="/dashboard">Finish Setup</Link>
                </Button>
            </Card>
        </div>
    );
  }

  return (
    <div className="container py-8 max-w-lg">
      <Link href="/dashboard" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="font-black uppercase tracking-tighter text-2xl text-center">Identity Sync</CardTitle>
          <CardDescription className="font-bold text-center">Provide details for Flutterwave verification.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-4">
          {isPageLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">First Name</Label><Input id="firstName" value={formData.firstName} onChange={handleChange} required className="rounded-xl bg-muted/50 border-none" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-black uppercase opacity-50">Last Name</Label><Input id="lastName" value={formData.lastName} onChange={handleChange} required className="rounded-xl bg-muted/50 border-none" /></div>
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase opacity-50">BVN or NIN (11 digits)</Label>
                    <Input id="bvn" value={formData.bvn} onChange={handleChange} required maxLength={11} minLength={11} className="font-mono text-lg rounded-xl bg-muted/50 border-none" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase opacity-50">Phone Number</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required className="font-mono text-lg rounded-xl bg-muted/50 border-none" />
                </div>
                <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl mt-4" disabled={isGenerating}>
                    {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : 'Activate Account'}
                </Button>
            </form>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
