'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_PRODUCTS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID } from 'appwrite';

export default function UploadProductPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    
    // Form State
    const [productName, setProductName] = useState('');
    const [description, setDescription] = useState('');
    const [contactType, setContactType] = useState('chat');
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

        if (!productName || !productImage || !description || !price || (contactType === 'call' && !phone)) {
            toast({ variant: 'destructive', title: 'Please fill all fields and upload an image.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Posting your product...' });

        try {
            const imageUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), productImage);

            const newProduct = {
                name: productName,
                description: description,
                imageUrl: getAppwriteStorageUrl(imageUpload.$id),
                price: Number(price),
                contactType: contactType,
                contactInfo: contactType === 'call' ? phone : '',
                sellerId: user.$id,
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_PRODUCTS, ID.unique(), newProduct);
            
            toast({ title: "Product Submitted!", description: "Your product is now live on the marketplace." });
            router.push('/dashboard/market?tab=products');

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <Link href="/dashboard/market" className="flex items-center gap-2 mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Market
        </Link>
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Upload Your Product</CardTitle>
                <CardDescription>Fill in the details below to list your product.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="productName">Product Name</Label>
                        <Input id="productName" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g., Wireless Headphones" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="productIcon">Product Image</Label>
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-24 h-24 bg-muted rounded-md flex items-center justify-center cursor-pointer border border-dashed"
                                onClick={() => productImageInputRef.current?.click()}
                            >
                                {productImagePreview ? (
                                    <Image src={productImagePreview} alt="Product Icon Preview" width={96} height={96} className="object-cover rounded-md"/>
                                ) : (
                                    <div className="text-center text-muted-foreground p-2">
                                        <ImageIcon className="mx-auto h-8 w-8" />
                                        <p className='text-xs'>Upload Image</p>
                                    </div>
                                )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => productImageInputRef.current?.click()}>Choose Image</Button>
                        </div>
                        <Input id="productIcon" type="file" className="hidden" ref={productImageInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Product Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your product (up to 200 characters)..." required rows={4} maxLength={200}/>
                    </div>

                    <div className="space-y-2">
                        <Label>Preferred Contact Method</Label>
                        <RadioGroup value={contactType} onValueChange={setContactType} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="chat" id="chat" />
                                <Label htmlFor="chat">Chat</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="call" id="call" />
                                <Label htmlFor="call">Phone Call</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {contactType === 'call' && (
                        <div className="space-y-2">
                            <Label htmlFor="phone">Your Phone Number</Label>
                            <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 08012345678" required/>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label htmlFor="price">Price (₦)</Label>
                        <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder='e.g., 5000' required/>
                        <p className="text-xs text-muted-foreground">An ₦80 service fee will be added to the final price for the buyer.</p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Posting Product...</> : "Post Product"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
