
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
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


const mockLibraryBooks = [
    { id: 'b1', name: 'The Art of I-Pay', icon: 'https://picsum.photos/seed/book1/200/300' },
    { id: 'b2', name: 'Digital Currency Explained', icon: 'https://picsum.photos/seed/book2/200/300' },
];

export default function LibraryPage() {
    const { toast } = useToast();
    const [books, setBooks] = useState(mockLibraryBooks);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDelete = (bookId: string) => {
        setBooks(prev => prev.filter(b => b.id !== bookId));
        toast({
            title: "Book Removed",
            description: "The book has been removed from your library."
        });
    };

    const filteredBooks = books.filter(book => 
        book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container py-8">
            <Link href="/dashboard/market" className="flex items-center gap-2 mb-4 text-sm">
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
                    {filteredBooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredBooks.map(book => (
                                <Card key={book.id}>
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <Image src={book.icon} alt={book.name} width={50} height={75} className="rounded-sm shadow-md" />
                                            <p className="font-semibold">{book.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/market/book/${book.id}/read`}>Read</Link>
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
                                                        <AlertDialogAction onClick={() => handleDelete(book.id)} className="bg-destructive hover:bg-destructive/90">
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
