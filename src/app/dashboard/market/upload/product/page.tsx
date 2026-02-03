'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UploadCloud, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function UploadProductPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [productIcon, setProductIcon] = useState<File | null>(null);
    const [productIconPreview, setProductIconPreview] = useState<string | null>(null);
    const [contactType, setContactType] = useState('chat');
    
    const productIconInputRef = useRef<HTMLInputElement>(null);

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProductIcon(file);
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setProductIconPreview(loadEvent.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate upload and processing
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Product Submitted!",
                description: "Your product is now live on the marketplace.",
            });
            router.push('/dashboard/market?new_product=true');
        }, 1500);
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
                        <Input id="productName" placeholder="e.g., Wireless Headphones" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="productIcon">Product Image</Label>
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-24 h-24 bg-muted rounded-md flex items-center justify-center cursor-pointer border border-dashed"
                                onClick={() => productIconInputRef.current?.click()}
                            >
                                {productIconPreview ? (
                                    <Image src={productIconPreview} alt="Product Icon Preview" width={96} height={96} className="object-cover rounded-md"/>
                                ) : (
                                    <div className="text-center text-muted-foreground p-2">
                                        <ImageIcon className="mx-auto h-8 w-8" />
                                        <p className='text-xs'>Upload Image</p>
                                    </div>
                                )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => productIconInputRef.current?.click()}>Choose Image</Button>
                        </div>
                        <Input id="productIcon" type="file" className="hidden" ref={productIconInputRef} onChange={handleIconChange} accept="image/png, image/jpeg, image/webp" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Product Description</Label>
                        <Textarea id="description" placeholder="Describe your product (up to 200 characters)..." required rows={4} maxLength={200}/>
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
                            <Input id="phone" type="tel" placeholder="e.g., 08012345678" required/>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label htmlFor="price">Price (₦)</Label>
                        <Input id="price" type="number" placeholder='e.g., 5000' required/>
                        <p className="text-xs text-muted-foreground">An ₦80 service fee will be added to the final price for the buyer.</p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Posting Product..." : "Post Product"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
