'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_BOOKS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID } from 'appwrite';

export default function UploadBookPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();

    // Form state
    const [bookName, setBookName] = useState('');
    const [description, setDescription] = useState('');
    const [priceType, setPriceType] = useState('free');
    const [price, setPrice] = useState('');

    // File state
    const [bookCover, setBookCover] = useState<File | null>(null);
    const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null);
    
    // Control state
    const [isLoading, setIsLoading] = useState(false);
    
    const bookCoverInputRef = useRef<HTMLInputElement>(null);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBookCover(file);
            setBookCoverPreview(URL.createObjectURL(file));
        }
    }
    
    const handleContinueToEditor = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        if (!bookName || !bookCover || !description || (priceType === 'paid' && !price)) {
            toast({ variant: 'destructive', title: 'Please fill all fields and upload a cover.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Creating book draft...' });

        try {
            const coverUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), bookCover);

            const newBookDraft = {
                name: bookName,
                description: description,
                content: '', // Content will be added in the editor
                coverUrl: getAppwriteStorageUrl(coverUpload.$id),
                price: priceType === 'paid' ? Number(price) : 0,
                priceType: priceType,
                sellerId: user.$id,
                status: 'draft', // New status field
            };

            const document = await databases.createDocument(DATABASE_ID, COLLECTION_ID_BOOKS, ID.unique(), newBookDraft);

            toast({ title: "Draft Created!", description: "Now, let's write the content." });
            router.push(`/dashboard/market/editor/book/${document.$id}`);

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
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
                <CardTitle>Upload Your Book - Step 1 of 2</CardTitle>
                <CardDescription>Fill in the details below to create your book listing.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleContinueToEditor} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="bookName">Book Name</Label>
                        <Input id="bookName" value={bookName} onChange={e => setBookName(e.target.value)} placeholder="e.g., The Art of I-Pay" required/>
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
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your book (up to 200 characters)..." required rows={3} maxLength={200}/>
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
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Draft...</> : "Continue to Editor"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
