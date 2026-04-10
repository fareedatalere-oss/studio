
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

/**
 * @fileOverview Upwork Profile Upload.
 * FORCED INSTANT CLOUDINARY LOGIC: Optimized for 10MB payloads.
 */

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !avatar || !certificate) {
            toast({ variant: 'destructive', title: 'Missing required files.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Uploading Profile...' });

        try {
            // 1. Parallel Instant Conversions
            const [avatarB64, certB64] = await Promise.all([
                toBase64(avatar),
                toBase64(certificate)
            ]);

            // 2. Direct Cloudinary Storage (Master Force)
            const [avatarUp, certUp] = await Promise.all([
                uploadToCloudinary(avatarB64, 'image'),
                uploadToCloudinary(certB64, 'raw')
            ]);

            if (!avatarUp.success || !certUp.success) {
                throw new Error(avatarUp.message || certUp.message || "Cloud upload failed.");
            }

            // 3. Instant Database Commit
            const newProfile = {
                name: user.name || 'Freelancer',
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
            toast({ title: "Identity Live!" });
            router.push('/dashboard/market?tab=upwork');

        } catch (error: any) {
            console.error("Upwork Upload Error:", error);
            toast({ variant: 'destructive', title: 'Upload Error', description: error.message });
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <Link href="/dashboard/market/upwork/warning" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card className="w-full max-w-2xl mx-auto rounded-[2rem] shadow-xl overflow-hidden border-none">
            <CardHeader className="bg-primary/5 pb-6">
                <CardTitle className="text-center font-black uppercase tracking-tighter">Freelance Profile</CardTitle>
                <CardDescription className="text-center font-bold">Fast Cloudinary direct sync active</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Profile Avatar</Label>
                        <div className="flex items-center gap-4">
                             <div 
                                className="w-24 h-24 bg-muted rounded-full flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden"
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
                        <Input value={title} onChange={e => setTitle(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none" placeholder="e.g. Graphic Designer" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">About Your Work</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} maxLength={200} className="rounded-xl bg-muted/50 border-none" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Operation Certificate</Label>
                        <Button type="button" variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl" onClick={() => certInputRef.current?.click()}>
                            <UploadCloud className="h-5 w-5" /> {certificate ? certificate.name : 'Upload Credentials'}
                        </Button>
                        <input type="file" ref={certInputRef} className="hidden" onChange={(e) => { if(e.target.files?.[0]) setCertificate(e.target.files[0]); }} required />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Contact Number</Label>
                        <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none" />
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Publish Instantly"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
