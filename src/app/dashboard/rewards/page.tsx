'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Wrench, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function RewardsPage() {
    const { toast } = useToast();

    useEffect(() => {
        toast({
            variant: 'destructive',
            title: 'Updating...',
            description: "This feature isn't working right away it's updating kindly try again later",
            duration: 8000
        });
    }, [toast]);

    return (
        <div className="container py-8 max-w-lg">
            <Link href="/dashboard" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            
            <Card className="rounded-[2.5rem] shadow-2xl border-none p-10 text-center overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-destructive animate-pulse"></div>
                <div className="bg-destructive/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wrench className="h-12 w-12 text-destructive animate-spin-slow" />
                </div>
                <CardHeader>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter text-destructive">Feature Offline</CardTitle>
                    <CardDescription className="font-bold text-sm text-foreground/70">
                        Maintenance in Progress
                    </CardDescription>
                </CardHeader>
                <CardContent className="mt-6">
                    <div className="p-6 rounded-3xl bg-muted/50 border-2 border-dashed border-destructive/20">
                        <p className="text-sm font-black uppercase tracking-tight text-destructive mb-4">Master Notification:</p>
                        <p className="text-sm font-bold leading-relaxed italic">
                            "This feature isn't working right away it's updating kindly try again later"
                        </p>
                    </div>
                </CardContent>
                <Button asChild variant="outline" className="w-full h-14 rounded-full font-black uppercase tracking-widest mt-8 border-2">
                    <Link href="/dashboard">Return to Home</Link>
                </Button>
            </Card>
        </div>
    );
}
