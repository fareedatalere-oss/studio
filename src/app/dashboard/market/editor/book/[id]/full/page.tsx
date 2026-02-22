'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Send, Trash2, Upload, Camera, Image as ImageIcon } from 'lucide-react';
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

export default function FullBookEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const bookId = params.id as string;

    const [book, setBook] = useState<any>(null);
    const [content, setContent] = useState('');
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
                    setContent(doc.content[0]);
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
        const editor = contentEditableRef.current;
        if (!editor) return;

        const handleImageClick = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG' && target.dataset.id === 'book-image') {
                const trigger = document.createElement('button');
                trigger.dataset.dialogTriggerFor = target.src;
                trigger.style.display = 'none';
                
                const dialog = document.getElementById(`dialog-for-${target.src}`);
                if (dialog) {
                    // This is a workaround to trigger the Radix dialog programmatically
                    (dialog.firstElementChild as HTMLButtonElement)?.click();
                }
            }
        };
        
        editor.addEventListener('click', handleImageClick);
        return () => editor.removeEventListener('click', handleImageClick);
    }, [content]);


    const handleContentChange = () => {
        if (contentEditableRef.current) {
            setContent(contentEditableRef.current.innerHTML);
        }
    };

    const saveDraft = async () => {
        if (!book) return false;
        setIsSaving(true);
        toast({ title: 'Saving draft...' });
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId, {
                content: [content],
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
            const imgHtml = `<img src="${url}" data-id="book-image" alt="User uploaded content" style="max-width: 100%; height: auto; border-radius: 0.5rem; cursor: pointer;" />`;
            
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

    const imagesInContent = content.match(/<img[^>]+src="([^">]+)"/g)?.map(img => img.match(/src="([^"]+)"/)?.[1]) || [];
    
    if (isLoading) {
        return (
            <div className="container py-8"><Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-96 w-full" /><div className="flex gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div></CardContent></Card></div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
             {/* Hidden dialogs for each image */}
            {imagesInContent.filter(Boolean).map((src, index) => (
                <Dialog key={index}>
                    <DialogTrigger asChild id={`dialog-for-${src}`}>
                        <button style={{display: 'none'}}>Open</button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-2">
                        <Image src={src!} alt="Full view" width={1200} height={800} className="rounded-md object-contain" />
                    </DialogContent>
                </Dialog>
            ))}

            <header className="sticky top-0 bg-background border-b p-4 z-10">
                <div className="container flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{book?.name || 'Book Editor'}</h1>
                        <p className="text-sm text-muted-foreground">Full Page Mode</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive-outline" size="sm" disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Discard</Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this book draft. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDiscard} className="bg-destructive hover:bg-destructive/90">Discard Draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </main>
            <footer className="sticky bottom-0 bg-background border-t p-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}/>
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
            </footer>
        </div>
    );
}
