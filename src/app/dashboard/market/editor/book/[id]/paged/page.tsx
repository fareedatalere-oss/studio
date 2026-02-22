'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Send, Trash2, Upload, Camera, Image as ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, COLLECTION_ID_BOOKS, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
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
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { ID } from 'appwrite';
import { cn } from '@/lib/utils';

export default function PagedBookEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const bookId = params.id as string;

    const [book, setBook] = useState<any>(null);
    const [pages, setPages] = useState<string[]>(['']);
    const [currentPage, setCurrentPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const contentEditableRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!bookId) return;
        const fetchBook = async () => {
            setIsLoading(true);
            try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId);
                setBook(doc);
                if (doc.content && doc.content.length > 0) {
                    setPages(doc.content);
                } else {
                    setPages(['']);
                }
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

    useEffect(() => {
        if (contentEditableRef.current) {
            contentEditableRef.current.innerHTML = pages[currentPage] || '';
        }
    }, [currentPage, pages]);

    const handleContentChange = () => {
        if (contentEditableRef.current) {
            const newPages = [...pages];
            newPages[currentPage] = contentEditableRef.current.innerHTML;
            setPages(newPages);
        }
    };

    const saveDraft = async () => {
        if (!book) return false;
        setIsSaving(true);
        toast({ title: 'Saving draft...' });
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId, {
                content: pages,
                status: 'draft',
            });
            toast({ title: 'Draft Saved!', description: 'Your changes have been saved.' });
            return true;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not save draft: ${error.message}` });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = async () => {
        if (!book) return;
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId);
            toast({ title: 'Book Discarded', description: 'The draft has been permanently deleted.' });
            router.push('/dashboard/market?tab=bookstore');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not discard book: ${error.message}` });
        }
    };
    
    const handleGoToPreview = async () => {
        const success = await saveDraft();
        if (success) {
            router.push(`/dashboard/market/editor/book/${bookId}/preview`);
        }
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;
        toast({ title: 'Uploading image...' });
        try {
            const uploadedFile = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(uploadedFile.$id);
            const imgHtml = `<img src="${url}" alt="User content" style="max-width: 100%; height: auto; border-radius: 0.5rem;" />`;
            
            if (contentEditableRef.current) {
                contentEditableRef.current.focus();
                document.execCommand('insertHTML', false, imgHtml);
                handleContentChange();
            }
            toast({ title: 'Image inserted!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
        }
    };

    const handleNextPage = () => {
        handleContentChange();
        if (currentPage === pages.length - 1) {
            setPages(prev => [...prev, '']);
        }
        setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        handleContentChange();
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    };

    if (isLoading) {
        return <div className="container py-8"><Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-96 w-full" /></CardContent></Card></div>;
    }

    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 bg-background border-b p-4 z-10">
                <div className="container flex items-center justify-between">
                     <div>
                        <h1 className="text-xl font-bold">{book?.name || 'Book Editor'}</h1>
                        <p className="text-sm text-muted-foreground">Page {currentPage + 1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive-outline" size="sm" disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Discard</Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this book draft.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDiscard} className="bg-destructive hover:bg-destructive/90">Discard Draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="sm" onClick={saveDraft} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Save Draft</Button>
                        <Button size="sm" onClick={handleGoToPreview} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}Post</Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                 <div
                    ref={contentEditableRef}
                    contentEditable={true}
                    onInput={handleContentChange}
                    suppressContentEditableWarning={true}
                    className="h-full w-full p-4 prose dark:prose-invert max-w-none focus:outline-none"
                    dangerouslySetInnerHTML={{ __html: pages[currentPage] }}
                />
            </main>
            <footer className="sticky bottom-0 bg-background border-t p-2 flex items-center justify-between">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4"/> Upload Image</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <div className="p-4 space-y-2">
                            <Button className="w-full justify-start gap-2" onClick={() => toast({ title: 'Camera coming soon!' })}><Camera className="h-5 w-5" /> Use Camera</Button>
                            <Button className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-5 w-5" /> From Device</Button>
                        </div>
                    </DialogContent>
                </Dialog>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevPage} disabled={currentPage === 0}><ArrowLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleNextPage}><ArrowRight className="h-4 w-4" /></Button>
                </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}/>
            </footer>
        </div>
    );
}
