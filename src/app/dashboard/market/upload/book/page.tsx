
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { uploadToCloudinary } from '@/app/actions/cloudinary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

export default function UploadBookPage() {
    const { toast } = useToast();
    const router = useRouter();

    const [bookName, setBookName] = useState('');
    const [description, setDescription] = useState('');
    const [priceType, setPriceType] = useState('free');
    const [price, setPrice] = useState('');
    const [bookCover, setBookCover] = useState<File | null>(null);
    const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    
    const bookCoverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const draft = localStorage.getItem('bookDraft');
        if (draft) setShowDraftDialog(true);
    }, []);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBookCover(file);
            setBookCoverPreview(URL.createObjectURL(file));
        }
    }
    
    const handleContinueToEditor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookName || !bookCover) return;

        setIsLoading(true);
        toast({ title: "Uploading Cover to Cloudinary..." });

        try {
            const coverBase64 = await toBase64(bookCover);
            const upload = await uploadToCloudinary(coverBase64);
            
            if (!upload.success) throw new Error(upload.message);
            
            const bookDraft = {
                name: bookName,
                description: description,
                coverUrl: upload.url,
                price: priceType === 'paid' ? Number(price) : 0,
                priceType: priceType,
                status: 'draft',
                pageByPage: false,
                content: [''],
                isBanned: false,
                isHidden: false,
            };

            localStorage.setItem('bookDraft', JSON.stringify(bookDraft));
            router.push(`/dashboard/market/editor/book/draft/select-mode`);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
            <AlertDialogContent className="rounded-[2rem]">
                <AlertDialogHeader><AlertDialogTitle>Unsaved Draft Found</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.push('/dashboard/market/editor/book/draft/select-mode')}>Continue</AlertDialogAction>
                    <AlertDialogCancel onClick={() => { localStorage.removeItem('bookDraft'); setShowDraftDialog(false); }}>Discard</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Link href="/dashboard/market?tab=bookstore" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card className="w-full max-w-2xl mx-auto rounded-[2rem] shadow-xl">
            <CardHeader>
                <CardTitle className="text-center font-black uppercase tracking-tighter">New Book - Part 1</CardTitle>
                <CardDescription className="text-center font-bold">Cloudinary Integrated Upload</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleContinueToEditor} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Book Name</Label>
                        <Input value={bookName} onChange={e => setBookName(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none px-4" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Cover Page</Label>
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-24 h-36 bg-muted rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden"
                                onClick={() => bookCoverInputRef.current?.click()}
                            >
                                {bookCoverPreview ? <Image src={bookCoverPreview} alt="Cover" width={96} height={144} className="object-cover"/> : <ImageIcon className="h-8 w-8 opacity-30" />}
                            </div>
                            <Button type="button" variant="outline" onClick={() => bookCoverInputRef.current?.click()} className="rounded-full h-10 font-black uppercase text-[9px]">Select Image</Button>
                        </div>
                        <input type="file" ref={bookCoverInputRef} className="hidden" onChange={handleCoverChange} accept="image/*" required />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] opacity-70">Short Synopsis</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} maxLength={200} className="rounded-xl bg-muted/50 border-none" />
                    </div>

                    <div className="space-y-3">
                        <Label className="font-black uppercase text-[10px] opacity-70">Pricing</Label>
                         <RadioGroup defaultValue="free" value={priceType} onValueChange={setPriceType} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="free" id="free" /><Label htmlFor="free">Free</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="paid" id="paid" /><Label htmlFor="paid">Paid</Label></div>
                        </RadioGroup>
                        {priceType === 'paid' && (
                            <Input type="number" placeholder='Price (₦)' value={price} onChange={(e) => setPrice(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none" />
                        )}
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Continue to Cloud Editor"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
