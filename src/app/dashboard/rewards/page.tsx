'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function RewardsPage() {
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!userLoading) {
            toast({
                variant: 'destructive',
                title: 'System Update',
                description: "This feature isn't working right away it's updating kindly try again later",
                duration: 8000
            });
        }
    }, [userLoading, toast]);

    return (
        <div className="container py-8 max-w-lg">
            <Link href="/dashboard" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            
            <Card className="rounded-[2.5rem] shadow-2xl border-none p-10 text-center">
                <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wrench className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <CardHeader>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Updating Rewards</CardTitle>
                    <CardDescription className="text-destructive font-black text-sm">
                        This feature isn't working right away it's updating kindly try again later.
                    </CardDescription>
                </CardHeader>
                <CardContent className="mt-6">
                    <Alert className="rounded-2xl bg-muted/50 border-none">
                        <AlertTitle className="font-black uppercase text-[10px] tracking-widest opacity-50 mb-2">Notice</AlertTitle>
                        <AlertDescription className="text-xs font-bold leading-relaxed">
                            Our team is currently optimizing the reward distribution engine to provide faster and more accurate payouts. We apologize for the delay.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <Button asChild className="w-full h-14 rounded-full font-black uppercase tracking-widest mt-8 shadow-xl">
                    <Link href="/dashboard">Return to Home</Link>
                </Button>
            </Card>
        </div>
    );
}