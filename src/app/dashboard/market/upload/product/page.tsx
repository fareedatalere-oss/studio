
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, ImageIcon, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_PRODUCTS, ID } from '@/lib/appwrite';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

export default function UploadProductPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    
    // Form State
    const [productName, setProductName] = useState('');
    const [description, setDescription] = useState('');
    const [phone, setPhone] = useState('');
    const [price, setPrice] = useState('');
    
    // File State
    const [productImage, setProductImage] = useState<File | null>(null);
    const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
    
    // Control State
    const [isLoading, setIsLoading] = useState(false);
    
    const productImageInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProductImage(file);
            setProductImagePreview(URL.createObjectURL(file));
        }
    }

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
        if (!user || !productImage) return;

        setIsLoading(true);
        toast({ title: 'Direct Cloudinary Uploading...' });

        try {
            const b64 = await toBase64(productImage);
            const upload = await uploadToCloudinary(b64);
            
            if (!upload.success) throw new Error(upload.message);

            const newProduct = {
                name: productName,
                description: description,
                imageUrl: upload.url,
                price: Number(price),
                contactType: 'call',
                contactInfo: phone,
                sellerId: user.$id,
                isBanned: false,
                isHidden: false,
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_PRODUCTS, ID.unique(), newProduct);
            toast({ title: "Success!", description: "Product listed directly via Cloudinary." });
            router.push('/dashboard/market?tab=products');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Post Failed', description: error.message });
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <Link href="/dashboard/market?tab=products" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card className="w-full max-w-2xl mx-auto rounded-[2rem] shadow-xl overflow-hidden border-none">
            <CardHeader className="bg-primary/5 pb-6">
                <CardTitle className="text-xl font-black uppercase tracking-tighter text-center">Sell New Product</CardTitle>
                <CardDescription className="text-center font-bold">List your item for sale on I-Pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Product Name</Label>
                        <Input value={productName} onChange={e => setProductName(e.target.value)} required className="rounded-xl bg-muted/50 border-none h-12 px-4" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Display Photo</Label>
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden"
                                onClick={() => productImageInputRef.current?.click()}
                            >
                                {productImagePreview ? <Image src={productImagePreview} alt="Preview" width={96} height={96} className="object-cover"/> : <ImageIcon className="mx-auto h-6 w-6 opacity-30" />}
                            </div>
                            <Button type="button" variant="outline" onClick={() => productImageInputRef.current?.click()} className="rounded-full h-10 font-black uppercase text-[9px]">Select Photo</Button>
                        </div>
                        <input type="file" ref={productImageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} required />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="rounded-xl bg-muted/50 border-none" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Contact Phone</Label>
                        <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="rounded-xl bg-muted/50 border-none h-12 px-4" />
                    </div>

                    <div className='space-y-2'>
                        <Label className="font-black uppercase text-[10px] opacity-70">Price (₦)</Label>
                        <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required className="rounded-xl bg-muted/50 border-none h-12 px-4 font-black" />
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm & Post'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
