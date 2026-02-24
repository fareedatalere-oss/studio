
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_BOOKS } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ReadBookPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const bookId = params.id as string;

    const [book, setBook] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (bookId) {
            databases.getDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId)
                .then(doc => {
                    if (doc.status !== 'published') {
                        toast({ variant: 'destructive', title: 'Not Available', description: 'This book is not yet published.' });
                        router.back();
                    } else {
                        setBook(doc);
                    }
                })
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Error', description: 'Failed to load book.' });
                    router.back();
                })
                .finally(() => setIsLoading(false));
        }
    }, [bookId, toast, router]);

    if (isLoading) {
        return (
            <div className="container py-8 space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="w-full h-[600px]" />
            </div>
        );
    }
    
    if (!book) {
        return (
            <div className="container py-8 text-center">
                 <Link href="/dashboard/market">
                    <Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Market</Button>
                </Link>
                <p className="mt-4">Book not found or could not be loaded.</p>
            </div>
        );
    }

    const pages = book.content || [];
    const canGoNext = currentPage < pages.length - 1;
    const canGoPrev = currentPage > 0;

    return (
        <div className="container py-8">
            <Button onClick={() => router.back()} variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                        <BookOpen /> {book.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div 
                        className={cn(
                            "prose dark:prose-invert max-w-none border rounded-lg p-6 min-h-[50vh] bg-background", 
                            !book.pageByPage && "overflow-y-auto"
                        )}
                        style={!book.pageByPage ? { maxHeight: '70vh' } : {}}
                    >
                         <div dangerouslySetInnerHTML={{ __html: book.pageByPage ? (pages[currentPage] || '') : (pages[0] || '') }} />
                    </div>
                </CardContent>
                {book.pageByPage && pages.length > 1 && (
                    <CardFooter className="flex items-center justify-between">
                        <Button size="icon" variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={!canGoPrev}><ArrowLeft /></Button>
                        <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {pages.length}</span>
                        <Button size="icon" variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={!canGoNext}><ArrowRight /></Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
