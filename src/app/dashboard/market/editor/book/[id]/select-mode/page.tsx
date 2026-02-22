'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Book, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SelectBookEditorModePage() {
    const router = useRouter();

    const handleModeClick = (mode: 'paged' | 'full') => {
        const localDraft = localStorage.getItem('bookDraft');
        if (localDraft) {
            const draft = JSON.parse(localDraft);
            draft.pageByPage = mode === 'paged';
            localStorage.setItem('bookDraft', JSON.stringify(draft));
        } else {
             // Handle case where draft is lost, maybe redirect
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
                    <Link href="/dashboard/market/editor/book/draft/full" onClick={() => handleModeClick('full')} className="block">
                        <div
                            className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer flex flex-col items-center text-center gap-2 h-full"
                        >
                            <FileText className="h-10 w-10" />
                            <h3 className="font-semibold">Full Page Editor</h3>
                            <p className="text-sm text-muted-foreground">Write your entire book in a single, continuous document.</p>
                        </div>
                    </Link>
                    <Link href="/dashboard/market/editor/book/draft/paged" onClick={() => handleModeClick('paged')} className="block">
                        <div
                            className="p-6 border rounded-lg hover:bg-muted/50 cursor-pointer flex flex-col items-center text-center gap-2 h-full"
                        >
                            <Book className="h-10 w-10" />
                            <h3 className="font-semibold">Page-by-Page Editor</h3>
                            <p className="text-sm text-muted-foreground">Structure your book into individual, numbered pages.</p>
                        </div>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
