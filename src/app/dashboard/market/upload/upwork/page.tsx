
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UploadCloud, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_UPWORK_PROFILES, ID } from '@/lib/appwrite';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

export default function UploadUpworkProfilePage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [certificate, setCertificate] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const certInputRef = useRef<HTMLInputElement>(null);

    function toBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !avatar || !certificate) return;

        setIsLoading(true);
        toast({ title: 'Direct Cloudinary Multi-Upload...' });

        try {
            const avatarB64 = await toBase64(avatar);
            const certB64 = await toBase64(certificate);

            const [avatarUp, certUp] = await Promise.all([
                uploadToCloudinary(avatarB64),
                uploadToCloudinary(certB64, 'raw')
            ]);

            if (!avatarUp.success || !certUp.success) throw new Error("File upload failed.");

            const newProfile = {
                name: user.name,
                title,
                description,
                phoneNumber: phone,
                address,
                avatarUrl: avatarUp.url,
                certificateUrl: certUp.url,
                sellerId: user.$id,
                isBanned: false,
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_UPWORK_PROFILES, ID.unique(), newProfile);
            toast({ title: "Freelance Profile Active!" });
            router.push('/dashboard/market?tab=upwork');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed', description: error.message });
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <Link href="/dashboard/market/upwork/warning" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card className="w-full max-w-2xl mx-auto rounded-[2rem] shadow-xl">
            <CardHeader>
                <CardTitle className="text-center font-black uppercase tracking-tighter">Freelance Identity</CardTitle>
                <CardDescription className="text-center font-bold">Cloudinary Direct Payout logic integrated</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Profile Avatar</Label>
                        <div className="flex items-center gap-4">
                             <div 
                                className="w-24 h-24 bg-muted rounded-full flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden shadow-sm"
                                 onClick={() => avatarInputRef.current?.click()}
                            >
                                {avatarPreview ? <Image src={avatarPreview} alt="Avatar" width={96} height={96} className="object-cover"/> : <ImageIcon className="h-8 w-8 opacity-30" />}
                            </div>
                            <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()} className="rounded-full h-10 font-black uppercase text-[9px]">Select Photo</Button>
                        </div>
                        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { setAvatar(e.target.files[0]); setAvatarPreview(URL.createObjectURL(e.target.files[0])); } }} required />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Professional Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">About Your Work</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} maxLength={200} className="rounded-xl bg-muted/50 border-none" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Operation Certificate</Label>
                        <Button type="button" variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl" onClick={() => certInputRef.current?.click()}>
                            <UploadCloud className="h-5 w-5" /> {certificate ? certificate.name : 'Choose Certificate File'}
                        </Button>
                        <input type="file" ref={certInputRef} className="hidden" onChange={(e) => { if(e.target.files?.[0]) setCertificate(e.target.files[0]); }} required />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Business Address</Label>
                        <Input value={address} onChange={e => setAddress(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none" />
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Submit directly to Market"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
