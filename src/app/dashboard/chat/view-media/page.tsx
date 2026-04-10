
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

function MediaViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const url = searchParams.get('url');
    const type = searchParams.get('type');

    if (!url) return <div className="h-screen flex items-center justify-center font-black uppercase text-xs">No media provided</div>;

    return (
        <div className="h-screen bg-black text-white flex flex-col">
            <header className="p-4 pt-12 flex items-center justify-between bg-black/50 z-10 border-b border-white/10">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 text-white">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="font-black uppercase text-[10px] tracking-[0.3em]">{type} Viewer</h1>
                <Button variant="ghost" size="icon" onClick={() => window.open(url)} className="rounded-full hover:bg-white/10 text-white">
                    <Download className="h-5 w-5" />
                </Button>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                {type === 'image' && (
                    <div className="relative w-full h-full max-w-4xl">
                        <Image src={url} alt="Preview" fill className="object-contain" priority unoptimized />
                    </div>
                )}
                {type === 'video' && (
                    <video src={url} controls autoPlay className="max-h-full max-w-full rounded-xl shadow-2xl" />
                )}
                {type === 'pdf' && (
                    <div className="text-center space-y-6">
                        <div className="bg-white/10 p-10 rounded-[3rem] border border-white/20">
                            <X className="h-20 w-20 mx-auto opacity-20" />
                            <p className="mt-6 font-black uppercase text-sm tracking-widest">PDF Document</p>
                        </div>
                        <Button size="lg" className="rounded-full font-black uppercase tracking-widest px-10" onClick={() => window.open(url)}>
                            Download to Open
                        </Button>
                    </div>
                )}
            </main>
            
            <footer className="p-6 text-center opacity-30">
                <p className="text-[8px] font-black uppercase tracking-[0.5em]">I-pay online world security</p>
            </footer>
        </div>
    );
}

export default function MediaViewerPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <MediaViewContent />
        </Suspense>
    );
}
