'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_BOOKS } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function BookPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const bookId = params.id as string;

    const [book, setBook] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (bookId) {
            databases.getDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId)
                .then(setBook)
                .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to load book preview.' }))
                .finally(() => setIsLoading(false));
        }
    }, [bookId, toast]);

    const handlePost = async () => {
        setIsPosting(true);
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId, { status: 'published' });
            toast({ title: 'Book Published!', description: 'Your book is now live on the marketplace.' });
            router.push('/dashboard/market?tab=bookstore');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to publish', description: error.message });
            setIsPosting(false);
        }
    };
    
    if (isLoading) {
        return <div className="container py-8"><Skeleton className="w-full h-[600px]" /></div>;
    }
    
    if (!book) {
        return <div className="container py-8 text-center">Book not found.</div>;
    }

    const pages = book.content || [];
    const canGoNext = currentPage < pages.length - 1;
    const canGoPrev = currentPage > 0;

    return (
        <div className="container py-8">
            <Button onClick={() => router.back()} variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
            </Button>
            <Card className="w-full max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Final Preview</CardTitle>
                    <CardDescription>Review your book before publishing it to the marketplace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <Image src={book.coverUrl} alt={book.name} width={150} height={225} className="rounded-md shadow-lg object-cover" />
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">{book.name}</h2>
                            <p className="text-muted-foreground">{book.description}</p>
                            <p className="font-bold text-lg">{book.priceType === 'free' ? 'Free' : `₦${book.price.toLocaleString()}`}</p>
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">Book Content</h3>
                        <div className="relative border rounded-lg p-6 min-h-[300px] bg-background">
                            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }} />
                             {book.pageByPage && pages.length > 1 && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                    <Button size="icon" variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={!canGoPrev}><ArrowLeft /></Button>
                                    <span>Page {currentPage + 1} of {pages.length}</span>
                                    <Button size="icon" variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={!canGoNext}><ArrowRight /></Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full" disabled={isPosting}>
                                {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Confirm & Post to Market'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Ready to publish?</AlertDialogTitle><AlertDialogDescription>This will make your book available to everyone on the marketplace. You can still edit it later.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePost} disabled={isPosting}>Publish</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
