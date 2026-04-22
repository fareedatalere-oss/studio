
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * @fileOverview AI Engineer Hub - DISABLED.
 */

export default function AiEngineersPage() {
    const router = useRouter();

    useEffect(() => {
        setTimeout(() => router.replace('/manager/dashboard'), 5000);
    }, [router]);

    return (
        <div className="h-screen flex items-center justify-center bg-background p-6">
            <Card className="max-w-md w-full rounded-[2rem] border-none shadow-2xl text-center p-10">
                <CardHeader>
                    <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldX className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Access Terminated</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-bold text-muted-foreground">
                        The AI Engineering Hub has been removed from this application build. You will be redirected to the manager dashboard.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
