'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Send, Trash2, Upload, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, COLLECTION_ID_BOOKS, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
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

function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export default function FullBookEditorPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const [draft, setDraft] = useState<any>(null);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const contentEditableRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const localDraft = localStorage.getItem('bookDraft');
        if (!localDraft) {
            toast({ variant: 'destructive', title: 'No draft found', description: 'Please start a new book.' });
            router.push('/dashboard/market/upload/book');
            return;
        }
        const parsedDraft = JSON.parse(localDraft);
        setDraft(parsedDraft);
        setContent(parsedDraft.content[0] || '');
        setIsLoading(false);
    }, [router, toast]);

    useEffect(() => {
        if (contentEditableRef.current && !isLoading) {
            contentEditableRef.current.innerHTML = content;
        }
    }, [content, isLoading]);

    const handleContentChange = () => {
        if (contentEditableRef.current) {
            const newContent = contentEditableRef.current.innerHTML;
            setDraft((prev: any) => ({ ...prev, content: [newContent] }));
        }
    };

    const saveDraft = () => {
        if (!draft) return false;
        setIsSaving(true);
        toast({ title: 'Saving draft...' });
        try {
            localStorage.setItem('bookDraft', JSON.stringify({ ...draft, content: [contentEditableRef.current?.innerHTML || '']}));
            toast({ title: 'Draft Saved!', description: 'Your changes have been saved to your browser.' });
            return true;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not save draft: ${error.message}` });
            return false;
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDiscard = () => {
        localStorage.removeItem('bookDraft');
        toast({ title: 'Book Discarded', description: 'The draft has been permanently deleted.' });
        router.push('/dashboard/market?tab=bookstore');
    };

    const handlePost = async () => {
        if (!draft || !user) return;
        setIsSaving(true);
        toast({ title: 'Submitting draft to database...' });

        try {
            // 1. Upload cover image
            const coverFile = dataURLtoFile(draft.coverUrl, 'cover.png');
            const coverUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), coverFile);
            const finalCoverUrl = getAppwriteStorageUrl(coverUpload.$id);
            
            // 2. Create document in database
            const finalDraft = {
                ...draft,
                content: [contentEditableRef.current?.innerHTML || ''],
                coverUrl: finalCoverUrl,
                sellerId: user.$id,
            };

            const document = await databases.createDocument(DATABASE_ID, COLLECTION_ID_BOOKS, ID.unique(), finalDraft);
            
            // 3. Clear local draft and navigate to preview
            localStorage.removeItem('bookDraft');
            toast({ title: 'Draft Sent to Preview!', description: 'Review your book before publishing.' });
            router.push(`/dashboard/market/editor/book/${document.$id}/preview`);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: `Could not post book: ${error.message}` });
             setIsSaving(false);
        }
    };
    
    const handleImageUpload = async (file: File) => {
        if (!file) return;
        toast({ title: 'Uploading image...' });
        try {
            const uploadedFile = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
            const url = getAppwriteStorageUrl(uploadedFile.$id);
            const imgHtml = `<img src="${url}" alt="User uploaded content" style="max-width: 100%; height: auto; border-radius: 0.5rem; cursor: pointer;" />`;
            
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

    if (isLoading) {
        return <div className="container py-8"><Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-96 w-full" /></CardContent></Card></div>;
    }

    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 bg-background border-b p-4 z-10">
                <div className="container flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{draft?.name || 'Book Editor'}</h1>
                        <p className="text-sm text-muted-foreground">Full Page Mode</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive-outline" size="sm" disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Discard</Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this book draft from your browser. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDiscard} className="bg-destructive hover:bg-destructive/90">Discard Draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="sm" onClick={saveDraft} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Save Draft</Button>
                        <Button size="sm" onClick={handlePost} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}Post</Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <div
                    ref={contentEditableRef}
                    contentEditable={true}
                    onInput={handleContentChange}
                    suppressContentEditableWarning={true}
                    className="h-full w-full p-4 prose dark:prose-invert max-w-none focus:outline-none"
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
