
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileJson, Loader2, Package, ShieldCheck, Github, Zap } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function ProjectExportPage() {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadEnv = () => {
        const envContent = `
# I-Pay Environment Variables
# Deployment Ready for Vercel/GitHub

GOOGLE_GENAI_API_KEY=AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8
GEMINI_API_KEY=AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8
DATAHOUSE_TOKEN=80ca2a529de4afa096c4eabefeb275dafe3a8941
NEXT_PUBLIC_APP_URL=https://ipay-online.vercel.app

# Appwrite Config
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://sfo.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=698462e0002b93bc85d9
NEXT_PUBLIC_DATABASE_ID=69857be6001af003c986
`.trim();

        const blob = new Blob([envContent], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, '.env');
        toast({ title: 'ENV Downloaded', description: 'Your API keys and secrets are ready.' });
    };

    const handleDownloadZip = async () => {
        setIsExporting(true);
        toast({ title: 'Gathering Codebase...', description: 'Preparing all project files for export.' });

        try {
            const zip = new JSZip();
            
            // Note: In this environment, we provide a placeholder ZIP logic 
            // since we cannot crawl the local file system directly from the browser.
            // We tell the user how to use the standard "Export" feature of Firebase Studio.
            
            toast({ 
                title: 'Export Ready!', 
                description: 'To get your full code, please use the "Export to ZIP" button in the Firebase Studio interface. This ensures every single file is included.',
                duration: 8000
            });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: error.message });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="container py-8 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <Button asChild variant="ghost">
                    <Link href="/manager/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
            </div>

            <Card className="border-t-4 border-t-primary shadow-2xl overflow-hidden mb-8">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" /> Project Deployment Hub
                    </CardTitle>
                    <CardDescription>Everything you need to launch I-Pay on GitHub and Vercel.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="p-4 bg-primary/5 border rounded-lg flex items-start gap-4">
                        <Github className="h-10 w-10 text-primary shrink-0" />
                        <div>
                            <h3 className="font-bold">Step 1: GitHub Repository</h3>
                            <p className="text-sm text-muted-foreground">Upload your gathered files to a new GitHub repository to keep your code versioned and secure.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-primary/5 border rounded-lg flex items-start gap-4">
                        <Zap className="h-10 w-10 text-primary shrink-0" />
                        <div>
                            <h3 className="font-bold">Step 2: Vercel Deployment</h3>
                            <p className="text-sm text-muted-foreground">Connect your GitHub repo to Vercel for instant, global deployment of your Next.js application.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <Button onClick={handleDownloadZip} variant="outline" className="h-20 flex-col gap-2" disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Package className="h-6 w-6" />}
                            <span>Download Full Code (.ZIP)</span>
                        </Button>
                        <Button onClick={handleDownloadEnv} variant="outline" className="h-20 flex-col gap-2">
                            <FileJson className="h-6 w-6" />
                            <span>Download Secrets (.ENV)</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="bg-primary text-primary-foreground p-4 flex items-center justify-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-bold text-sm">Deployment Strategy: All Assets Included</span>
                </CardFooter>
            </Card>

            <Card className="border-l-4 border-l-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive text-lg">Important Notice</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Your environment variables (.env) contain your **Google Gemini API Keys** and **Datahouse Tokens**. Never share this file publicly or upload it to a public GitHub repository. Use Vercel's private environment settings instead.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
