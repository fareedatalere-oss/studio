
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BotOff } from 'lucide-react';

/**
 * @fileOverview Sofia AI Chat - DISABLED.
 * REDIRECT: Auto-redirects back to dashboard as AI has been removed.
 */

export default function AiChatPage() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/dashboard');
        }, 3000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-background p-10 text-center space-y-6">
            <div className="bg-muted p-8 rounded-[3rem] shadow-inner">
                <BotOff className="h-20 w-20 text-muted-foreground opacity-20 mx-auto" />
            </div>
            <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Feature Removed</h1>
                <p className="text-sm font-bold text-muted-foreground mt-2">
                    Sofia AI is no longer active in this testing build.
                </p>
            </div>
            <div className="flex items-center gap-2 opacity-40">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Returning to Hub...</span>
            </div>
        </div>
    );
}
