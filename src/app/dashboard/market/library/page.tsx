
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_BOOKS, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryPage() {
    const { profile, loading: userLoading, recheckUser } = useUser();
    const { toast } = useToast();
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (userLoading) return;
        if (!profile) {
            setLoading(false);
            return;
        }

        const fetchBooks = async () => {
            setLoading(true);
            const bookIds = profile.purchasedBookIds || [];
            if (bookIds.length === 0) {
                setBooks([]);
                setLoading(false);
                return;
            }

            try {
                const bookPromises = bookIds.map((id: string) => databases.getDocument(DATABASE_ID, COLLECTION_ID_BOOKS, id));
                const purchasedBooks = await Promise.all(bookPromises);
                setBooks(purchasedBooks.filter(Boolean)); // filter out any nulls if a book was deleted
            } catch (error) {
                toast({ title: 'Error', description: 'Could not load your library.', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, [profile, userLoading, toast]);


    const handleDelete = async (bookId: string) => {
        if (!profile) return;
        
        const originalBooks = books;
        setBooks(prev => prev.filter(b => b.$id !== bookId));
        
        try {
            const currentBooks = profile.purchasedBookIds || [];
            const newBooks = currentBooks.filter((id: string) => id !== bookId);
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, profile.$id, {
                purchasedBookIds: newBooks,
            });
            await recheckUser();
            toast({ title: "Book Removed", description: "The book has been removed from your library." });
        } catch(e) {
            setBooks(originalBooks);
            toast({ title: 'Error', description: 'Could not remove the book.', variant: 'destructive' });
        }
    };

    const filteredBooks = books.filter(book => 
        book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const LoadingSkeleton = () => (
         <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4">
                            <Skeleton className="h-[75px] w-[50px] rounded-sm" />
                             <Skeleton className="h-5 w-40" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-16" />
                            <Skeleton className="h-9 w-9" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="container py-8">
            <Link href="/dashboard/market?tab=bookstore" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Market
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>My Library</CardTitle>
                    <CardDescription>Your collection of saved books. Available offline.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search your library..." 
                            className="pl-10" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {loading || userLoading ? <LoadingSkeleton /> : filteredBooks.length > 0 ? (
                        <div className="space-y-4">
                            {filteredBooks.map(book => (
                                <Card key={book.$id}>
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <Image src={book.coverUrl} alt={book.name} width={50} height={75} className="rounded-sm shadow-md object-cover" />
                                            <p className="font-semibold">{book.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/market/book/${book.$id}/read`}>Read</Link>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently remove "{book.name}" from your library.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(book.$id)} className="bg-destructive hover:bg-destructive/90">
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                         <p className="text-center text-muted-foreground p-8">No books found in your library.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
