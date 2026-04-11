
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Send, Trash2, Upload, Camera, Image as ImageIcon, Palette, Bold } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, COLLECTION_ID_BOOKS, BUCKET_ID_UPLOADS, getAppwriteStorageUrl, ID } from '@/lib/appwrite';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

const bookEditorColors = [
    '#000000', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', 
    '#8b5cf6', '#64748b', '#facc15', '#14b8a6', '#ffffff', '#6b7280', '#84cc16', '#d946ef'
];

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
        if (!draft || !contentEditableRef.current) return false;
        setIsSaving(true);
        toast({ title: 'Saving draft...' });
        try {
            const newContent = contentEditableRef.current.innerHTML;
            const updatedDraft = { ...draft, content: [newContent] };
            localStorage.setItem('bookDraft', JSON.stringify(updatedDraft));
            setDraft(updatedDraft);
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
        if (!draft || !user || !contentEditableRef.current) return;
        setIsSaving(true);
        toast({ title: 'Submitting draft to database...' });

        try {
            const currentContent = contentEditableRef.current.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentContent;
            
            const imageWrappers = tempDiv.querySelectorAll<HTMLDivElement>('div[data-base64]');
            
            const uploadPromises = Array.from(imageWrappers).map(wrapper => {
                const base64Data = wrapper.dataset.base64 || '';
                const imageFile = dataURLtoFile(base64Data, `book-image-${Date.now()}.png`);
                return storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), imageFile);
            });

            const uploadedImages = await Promise.all(uploadPromises);

            imageWrappers.forEach((wrapper, index) => {
                const appwriteUrl = getAppwriteStorageUrl(uploadedImages[index].$id);
                const finalImg = document.createElement('img');
                finalImg.src = appwriteUrl;
                finalImg.alt = 'User uploaded content';
                finalImg.style.maxWidth = '100%';
                finalImg.style.height = 'auto';
                finalImg.style.borderRadius = '0.5rem';
                wrapper.replaceWith(finalImg);
            });

            const finalContent = tempDiv.innerHTML;

            // Upload cover image
            const coverFile = dataURLtoFile(draft.coverUrl, 'cover.png');
            const coverUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), coverFile);
            
            const finalDraftPayload = {
                ...draft,
                content: [finalContent],
                coverUrl: getAppwriteStorageUrl(coverUpload.$id),
                sellerId: user.$id,
            };

            const bookDocument = await databases.createDocument(DATABASE_ID, COLLECTION_ID_BOOKS, ID.unique(), finalDraftPayload);
            
            localStorage.removeItem('bookDraft');
            toast({ title: 'Draft Sent to Preview!', description: 'Review your book before publishing.' });
            router.push(`/dashboard/market/editor/book/${bookDocument.$id}/preview`);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error Posting Book', description: `Could not post book: ${error.message}` });
             setIsSaving(false);
        }
    };
    
    const handleImageUpload = async (file: File) => {
        if (!file) return;
        toast({ title: 'Uploading image...' });
        try {
            const base64Data = await toBase64(file);
            
            const imgHtml = `
                <div contenteditable="false" data-base64="${base64Data}" style="position: relative; display: inline-block; max-width: 200px; margin: 8px; vertical-align: middle;">
                    <img 
                        src="${base64Data}" 
                        alt="User content" 
                        style="max-width: 100%; height: auto; border-radius: 0.5rem; display: block; cursor: pointer;"
                        onclick="
                            const dialog = document.createElement('dialog');
                            dialog.style.cssText = 'padding: 0; border: none; background: transparent; max-width: 90vw; max-height: 90vh;';
                            dialog.innerHTML = '<img src=\\'${base64Data}\\' style=\\'max-width: 100%; max-height: 100%; object-fit: contain;\\' />';
                            dialog.addEventListener('click', () => dialog.close());
                            document.body.appendChild(dialog);
                            dialog.showModal();
                            dialog.addEventListener('close', () => document.body.removeChild(dialog));
                        "
                    />
                    <button
                        onclick="this.parentElement.remove()"
                        style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; line-height: 20px; text-align: center;"
                    >
                        &times;
                    </button>
                </div>
            `;
            
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

    const applyColor = (color: string) => {
        if (contentEditableRef.current) {
            contentEditableRef.current.focus();
            document.execCommand('foreColor', false, color);
        }
    };

    const applyBold = () => {
        if (contentEditableRef.current) {
            contentEditableRef.current.focus();
            document.execCommand('bold');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-screen">
                 <header className="sticky top-0 bg-background border-b p-4 z-10"><div className="container"><Skeleton className="h-8 w-1/2" /></div></header>
                 <main className="flex-1 overflow-y-auto p-4"><Skeleton className="h-96 w-full" /></main>
            </div>
        );
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
                        <Button variant="outline" size="icon" onClick={applyBold} title="Bold">
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" title="Text Color">
                                    <Palette className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto">
                                <div className="grid grid-cols-5 gap-2">
                                    {bookEditorColors.map(color => (
                                        <button 
                                            key={color} 
                                            onClick={() => applyColor(color)}
                                            className="h-6 w-6 rounded-full border"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4"/> Upload Image</Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Upload an Image</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Button className="w-full justify-start gap-2" onClick={() => toast({ title: 'Camera coming soon!' })}><Camera className="h-5 w-5" /> Use Camera</Button>
                                    <Button className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-5 w-5" /> From Device</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive-outline" size="sm" disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Discard</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this book draft from your browser. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDiscard} className="bg-destructive hover:bg-destructive/90">Discard Draft</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
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
                    dir="ltr"
                    className="h-full w-full p-4 max-w-none focus:outline-none text-foreground bg-background text-left"
                />
            </main>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}/>
        </div>
    );
}
