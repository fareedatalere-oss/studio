'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ChatDisabledPage() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/dashboard');
        }, 3000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="container py-8 flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Chat Disabled</CardTitle>
                    <CardDescription>
                        The chat feature is temporarily disabled. Redirecting you to the dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                </CardContent>
            </Card>
        </div>
    );
}
