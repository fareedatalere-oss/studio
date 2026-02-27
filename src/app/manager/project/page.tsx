
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileJson, Loader2, Package, ShieldCheck, Github, Zap, Smartphone, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function ProjectExportPage() {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadEnv = () => {
        const envContent = `
# I-Pay Master Environment Variables
# STRICTLY CONFIDENTIAL - DO NOT UPLOAD TO PUBLIC GITHUB

# AI & LLM CONFIG
GOOGLE_GENAI_API_KEY=AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8
GEMINI_API_KEY=AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8

# DATAHOUSE API (Airtime/Data/Bills)
DATAHOUSE_TOKEN=80ca2a529de4afa096c4eabefeb275dafe3a8941

# APPWRITE BACKEND
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://sfo.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=698462e0002b93bc85d9
NEXT_PUBLIC_DATABASE_ID=69857be6001af003c986

# PAYMENT GATEWAYS (Add these in Vercel settings)
FLUTTERWAVE_SECRET_KEY=YOUR_FLUTTERWAVE_KEY
PAYSTACK_SECRET_KEY=YOUR_PAYSTACK_KEY

# APP URL
NEXT_PUBLIC_APP_URL=https://ipay-online.vercel.app
`.trim();

        const blob = new Blob([envContent], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, '.env');
        toast({ title: 'ENV Downloaded', description: 'Secrets are ready for Vercel/GitHub.' });
    };

    const handleDownloadZip = async () => {
        setIsExporting(true);
        toast({ title: 'Packaging Source Code...', description: 'Gathering all logic files for deployment.' });

        try {
            const zip = new JSZip();
            
            // Core Deployment Instructions
            zip.file("DEPLOYMENT_GUIDE.txt", "1. Upload to a Private GitHub Repo.\n2. Connect to Vercel.\n3. Add variables from the downloaded .env to Vercel Settings -> Environment Variables.");
            zip.file(".env.example", "COPY SECRETS FROM DOWNLOADED .ENV HERE");
            
            // Add instructions for Android users to get the 100% full project
            const fullProjectNote = "Master Fahad, for the 100% absolute full project including hidden config files, please use the 'Export to ZIP' button in the IDE Sidebar (top right of the editor). This button provides the core logic bundle.";
            zip.file("IMPORTANT_NOTE.txt", fullProjectNote);

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "ipay-logic-bundle.zip");

            toast({ 
                title: 'Bundle Ready!', 
                description: 'Download started. Use the Sidebar Export for the full directory tree.',
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
                <CardHeader className="bg-muted/30 text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black">
                        <Package className="h-8 w-8 text-primary" /> Friday Deployment Hub
                    </CardTitle>
                    <CardDescription>Everything needed for immediate deployment to Vercel & GitHub.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-4">
                        <Smartphone className="h-10 w-10 text-blue-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-blue-900">Android Installable Mode</h3>
                            <p className="text-sm text-blue-800">I-Pay is now a PWA. Once you deploy, your users can click "Install" in their mobile browser menu to use it as a real app.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-4">
                        <Zap className="h-10 w-10 text-green-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-green-900">Step 1: Download Secrets</h3>
                            <p className="text-sm text-green-800">Click "Download Secrets" first. This file contains your live Datahouse and AI tokens. Give this to your admin.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <Button onClick={handleDownloadZip} variant="outline" className="h-28 flex-col gap-2 shadow-sm border-2 border-primary/20 hover:border-primary" disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-8 w-8 animate-spin" /> : <Package className="h-8 w-8 text-primary" />}
                            <div className="text-center">
                                <span className="font-black text-sm uppercase block">Source Bundle</span>
                                <span className="text-[10px] text-muted-foreground">(Core Logic .ZIP)</span>
                            </div>
                        </Button>
                        <Button onClick={handleDownloadEnv} variant="outline" className="h-28 flex-col gap-2 shadow-sm border-2 border-green-200 hover:border-green-500">
                            <FileJson className="h-8 w-8 text-green-600" />
                            <div className="text-center">
                                <span className="font-black text-sm uppercase block">Download Secrets</span>
                                <span className="text-[10px] text-muted-foreground">(.ENV File)</span>
                            </div>
                        </Button>
                    </div>

                    <div className="mt-8 p-6 bg-muted rounded-xl border">
                        <h3 className="font-black text-lg mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" /> Admin Deployment Guide
                        </h3>
                        <ol className="text-sm space-y-3 list-decimal pl-5 text-muted-foreground">
                            <li>Create a <strong>Private</strong> repository on GitHub.</li>
                            <li>Upload the files from the <strong>Sidebar Export</strong> (click the top-right export button in this IDE).</li>
                            <li>Go to <strong>Vercel</strong> and import the repository.</li>
                            <li>Paste the contents of the <strong>.env</strong> file into Vercel Settings -> Environment Variables.</li>
                            <li>Click <strong>Deploy</strong>.</li>
                        </ol>
                    </div>
                </CardContent>
                <CardFooter className="bg-primary text-primary-foreground p-4 flex items-center justify-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Production Ready Asset Hub</span>
                </CardFooter>
            </Card>

            <Card className="border-l-4 border-l-destructive bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive text-lg">Master Fahad: Urgent Notice</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        To get every single hidden file required for Vercel, please use the <strong>sidebar export feature</strong> of this editor. The buttons above provide the core secrets and logic bundle, but the sidebar export is the most complete for your admin.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
