
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
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_PRODUCTS, ID } from '@/lib/appwrite';

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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        if (!productName || !productImage || !description || !price || !phone) {
            toast({ variant: 'destructive', title: 'Please fill all fields and upload an image.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Posting your product...' });

        try {
            const imageUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), productImage);
            const imageUrl = imageUpload.url;

            const newProduct = {
                name: productName,
                description: description,
                imageUrl: imageUrl,
                price: Number(price),
                contactType: 'call',
                contactInfo: phone,
                sellerId: user.$id,
                isBanned: false,
                isHidden: false,
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_PRODUCTS, ID.unique(), newProduct);
            
            toast({ title: "Product Submitted!", description: "Your product is now live on the marketplace." });
            router.push('/dashboard/market?tab=products');

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <Link href="/dashboard/market?tab=products" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Market
        </Link>
        <Card className="w-full max-w-2xl mx-auto rounded-[2rem] shadow-xl overflow-hidden border-none">
            <CardHeader className="bg-primary/5 pb-6">
                <CardTitle className="text-xl font-black uppercase tracking-tighter text-center">Sell New Product</CardTitle>
                <CardDescription className="text-center font-bold">List your item for sale on I-Pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="productName" className="font-black uppercase text-[10px] opacity-70 tracking-widest">Product Name</Label>
                        <Input id="productName" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g., Wireless Headphones" required className="rounded-xl bg-muted/50 border-none h-12 px-4" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="productIcon" className="font-black uppercase text-[10px] opacity-70 tracking-widest">Display Photo</Label>
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden shadow-sm"
                                onClick={() => productImageInputRef.current?.click()}
                            >
                                {productImagePreview ? (
                                    <Image src={productImagePreview} alt="Product Icon Preview" width={96} height={96} className="object-cover rounded-md"/>
                                ) : (
                                    <div className="text-center text-muted-foreground p-2">
                                        <ImageIcon className="mx-auto h-6 w-6 opacity-30" />
                                    </div>
                                )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => productImageInputRef.current?.click()} className="rounded-full h-10 font-black uppercase text-[9px] tracking-widest px-6">
                                Select Image
                            </Button>
                        </div>
                        <Input id="productIcon" type="file" className="hidden" ref={productImageInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="font-black uppercase text-[10px] opacity-70 tracking-widest">Product Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your product (up to 200 characters)..." required rows={4} maxLength={200} className="rounded-xl bg-muted/50 border-none min-h-[100px]" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="font-black uppercase text-[10px] opacity-70 tracking-widest">Contact Phone Number</Label>
                        <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 08012345678" required className="rounded-xl bg-muted/50 border-none h-12 px-4" />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor="price" className="font-black uppercase text-[10px] opacity-70 tracking-widest">Selling Price (₦)</Label>
                        <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder='e.g., 5000' required className="rounded-xl bg-muted/50 border-none h-12 px-4 font-black" />
                        <p className="text-[10px] text-muted-foreground font-bold italic">Note: An ₦80 service fee will be added to the final price for the buyer.</p>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Post Product'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
