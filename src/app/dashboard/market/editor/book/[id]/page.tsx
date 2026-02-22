'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_BOOKS } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function BookEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const bookId = params.id as string;

    const [book, setBook] = useState<any>(null);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!bookId) return;

        const fetchBook = async () => {
            setIsLoading(true);
            try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId);
                setBook(doc);
                setContent(doc.content);
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load book data.' });
                router.push('/dashboard/market');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBook();
    }, [bookId, router, toast]);

    const handleSave = async (status: 'draft' | 'published') => {
        if (!book) return;
        setIsSaving(true);
        const isPublishing = status === 'published';
        
        toast({ title: isPublishing ? 'Publishing book...' : 'Saving draft...' });

        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId, {
                content,
                status,
            });

            toast({
                title: isPublishing ? 'Book Published!' : 'Draft Saved!',
                description: isPublishing ? 'Your book is now live on the marketplace.' : 'Your changes have been saved.',
            });
            
            if (isPublishing) {
                router.push('/dashboard/market?tab=bookstore');
            }
            
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not save book: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDiscard = () => {
        router.push('/dashboard/market/upload/book');
    }

    if (isLoading) {
        return (
            <div className="container py-8">
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-96 w-full" />
                        <div className="flex gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 bg-background border-b p-4 z-10">
                <div className="container flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{book?.name || 'Book Editor'}</h1>
                        <p className="text-sm text-muted-foreground">Editing page by page</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive-outline" size="sm" disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Discard</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Any unsaved changes will be lost. Are you sure you want to discard and go back?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDiscard} className="bg-destructive hover:bg-destructive/90">
                                        Discard Changes
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Save Draft
                        </Button>
                        <Button size="sm" onClick={() => handleSave('published')} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                            Post
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-4">
                <Textarea
                    placeholder="Start writing your book here..."
                    className="h-full w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </main>
        </div>
    );
}
