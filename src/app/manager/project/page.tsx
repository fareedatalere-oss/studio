'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2, Package, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { saveAs } from 'file-saver';

export default function ProjectExportPage() {
    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadEnv = () => {
        const envContent = `
# I-Pay Master Environment Variables
# STRICTLY CONFIDENTIAL

GOOGLE_GENAI_API_KEY=AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8
GEMINI_API_KEY=AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8
DATAHOUSE_TOKEN=80ca2a529de4afa096c4eabefeb275dafe3a8941
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://sfo.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=698462e0002b93bc85d9
NEXT_PUBLIC_DATABASE_ID=69857be6001af003c986
NEXT_PUBLIC_APP_URL=https://ipay-online.vercel.app
`.trim();

        const blob = new Blob([envContent], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, '.env');
    };

    return (
        <div className="container py-8 max-w-3xl">
            <Button asChild variant="ghost" className="mb-6">
                <Link href="/manager/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
            </Button>

            <Card className="border-t-4 border-t-primary shadow-2xl overflow-hidden">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black">
                        <ShieldCheck className="h-8 w-8 text-primary" /> Deployment Hub
                    </CardTitle>
                    <CardDescription>Get your Vercel secrets and configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-muted rounded-lg text-sm">
                        <p className="font-bold mb-2 uppercase">Vercel Instructions:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Go to <strong>Your App</strong> in the manager header.</li>
                            <li>Download the <strong>Full Project (.ZIP)</strong>.</li>
                            <li>Download the <strong>Secrets (.ENV)</strong> below.</li>
                            <li>Push ZIP contents to GitHub and deploy.</li>
                        </ol>
                    </div>

                    <div className="grid gap-4">
                        <Button asChild className="h-20 flex-col gap-1">
                            <Link href="/manager/your-app">
                                <Package />
                                <span className="font-bold uppercase text-xs">Go to "Your App" Force Export</span>
                            </Link>
                        </Button>
                        <Button onClick={handleDownloadEnv} variant="outline" className="h-16 flex-col gap-1 border-primary text-primary">
                            <Download />
                            <span className="font-bold uppercase text-[10px]">Download Secrets (.ENV)</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="bg-primary text-primary-foreground p-4 justify-center font-bold text-[10px] uppercase">
                    Master Fahad: Deployment Optimized for Friday
                </CardFooter>
            </Card>
        </div>
    );
}
