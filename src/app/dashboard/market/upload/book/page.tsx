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

export default function UploadBookPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [bookCover, setBookCover] = useState<File | null>(null);
    const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null);
    const [priceType, setPriceType] = useState('free');
    const [price, setPrice] = useState('');
    
    const bookCoverInputRef = useRef<HTMLInputElement>(null);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBookCover(file);
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setBookCoverPreview(loadEvent.target?.result as string);
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
                title: "Book Submitted!",
                description: "Your book is now live on the marketplace.",
            });
            router.push('/dashboard/market?new_book=true');
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
                <CardTitle>Upload Your Book</CardTitle>
                <CardDescription>Fill in the details below to publish your book.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="bookName">Book Name</Label>
                        <Input id="bookName" placeholder="e.g., The Art of I-Pay" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bookCover">Book Cover</Label>
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-24 h-36 bg-muted rounded-md flex items-center justify-center cursor-pointer border border-dashed"
                                onClick={() => bookCoverInputRef.current?.click()}
                            >
                                {bookCoverPreview ? (
                                    <Image src={bookCoverPreview} alt="Book Cover Preview" width={96} height={144} className="object-cover rounded-md"/>
                                ) : (
                                    <div className="text-center text-muted-foreground p-2">
                                        <ImageIcon className="mx-auto h-8 w-8" />
                                        <p className='text-xs'>Upload Cover</p>
                                    </div>
                                )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => bookCoverInputRef.current?.click()}>Choose Image</Button>
                        </div>
                        <Input id="bookCover" type="file" className="hidden" ref={bookCoverInputRef} onChange={handleCoverChange} accept="image/png, image/jpeg, image/webp" required/>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Book Description</Label>
                        <Textarea id="description" placeholder="Describe your book (up to 200 characters)..." required rows={3} maxLength={200}/>
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="content">Book Content</Label>
                        <Textarea id="content" placeholder="Paste the full content of your book here..." required rows={10}/>
                        <p className="text-xs text-muted-foreground">For this prototype, page-by-page editing is disabled. Please paste the full text.</p>
                    </div>

                    <div className="space-y-3">
                        <Label>Pricing</Label>
                         <RadioGroup defaultValue="free" value={priceType} onValueChange={setPriceType} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="free" id="free" />
                                <Label htmlFor="free">Free</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="paid" id="paid" />
                                <Label htmlFor="paid">Paid</Label>
                            </div>
                        </RadioGroup>
                        {priceType === 'paid' && (
                            <div className='space-y-2'>
                                <Label htmlFor="price">Price (₦)</Label>
                                <Input id="price" type="number" placeholder='e.g., 2500' value={price} onChange={(e) => setPrice(e.target.value)} required/>
                                <p className="text-xs text-muted-foreground">A ₦50 service fee will be added to the final price for the buyer.</p>
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Posting Book..." : "Post Book"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
