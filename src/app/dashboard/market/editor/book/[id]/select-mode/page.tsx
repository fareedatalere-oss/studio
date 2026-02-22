'use client';

import { useRouter } from 'next/navigation';
import { Book, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SelectBookEditorModePage() {
    const router = useRouter();

    const handleSelectMode = (mode: 'paged' | 'full') => {
        const localDraft = localStorage.getItem('bookDraft');
        if (localDraft) {
            const draft = JSON.parse(localDraft);
            draft.pageByPage = mode === 'paged';
            localStorage.setItem('bookDraft', JSON.stringify(draft));
            router.push(`/dashboard/market/editor/book/draft/${mode}`);
        } else {
            // Handle case where draft is lost
            router.push('/dashboard/market/upload/book');
        }
    };

    return (
        <div className="container py-8 flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle>Choose Your Editor</CardTitle>
                    <CardDescription>How would you like to write your book?</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div
                        className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer flex flex-col items-center text-center gap-2"
                        onClick={() => handleSelectMode('full')}
                    >
                        <FileText className="h-10 w-10" />
                        <h3 className="font-semibold">Full Page Editor</h3>
                        <p className="text-sm text-muted-foreground">Write your entire book in a single, continuous document.</p>
                    </div>
                    <div
                        className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer flex flex-col items-center text-center gap-2"
                        onClick={() => handleSelectMode('paged')}
                    >
                        <Book className="h-10 w-10" />
                        <h3 className="font-semibold">Page-by-Page Editor</h3>
                        <p className="text-sm text-muted-foreground">Structure your book into individual, numbered pages.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
