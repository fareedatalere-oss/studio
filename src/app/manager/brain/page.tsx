'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Database, Brain, Image as ImageIcon, Film, ArrowLeft } from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

/**
 * @fileOverview Master AI Brain Page.
 * IDENTITY: Displays a large black brain with logic expansion controls.
 */

export default function MasterBrainPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (sessionStorage.getItem('ipay_ai_master_access') !== 'true') {
            router.replace('/auth/signin');
        }
    }, [router]);

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-body">
            <div className="absolute top-10 left-6">
                <Button variant="ghost" onClick={() => router.push('/dashboard')} className="font-black uppercase text-[10px] gap-2">
                    <ArrowLeft className="h-4 w-4" /> Exit Core
                </Button>
            </div>

            <div className="relative flex flex-col items-center gap-10">
                <div className="relative group">
                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                    <div className="bg-black h-56 w-56 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.3)] relative border-8 border-white/10">
                        <Brain className="h-32 w-32 text-white" />
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black uppercase tracking-tighter">AI Brain</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">Intelligence Management Hub</p>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" className="h-20 w-20 rounded-full shadow-2xl bg-primary hover:scale-105 active:scale-95 transition-transform">
                                <Plus className="h-10 w-10" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-64 p-3 rounded-[2rem] font-black uppercase text-[10px] shadow-2xl border-none">
                            <DropdownMenuItem onClick={() => router.push('/manager/brain/add')} className="gap-3 p-4 rounded-2xl cursor-pointer">
                                <Brain className="h-5 w-5 text-primary" /> Add Prompt Knowledge
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/manager/brain/add?type=media')} className="gap-3 p-4 rounded-2xl cursor-pointer">
                                <div className="flex gap-1">
                                    <ImageIcon className="h-5 w-5 text-primary" />
                                    <Film className="h-5 w-5 text-primary" />
                                </div>
                                Add for Image / Video
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button onClick={() => router.push('/manager/brain/vault/bypass')} variant="outline" size="icon" className="h-20 w-20 rounded-full border-4 shadow-xl">
                        <Database className="h-8 w-8 text-primary" />
                    </Button>
                </div>
            </div>

            <footer className="absolute bottom-10 opacity-20">
                <p className="text-[8px] font-black uppercase tracking-[0.5em]">I-Pay Internal Intelligence Protocol</p>
            </footer>
        </div>
    );
}
