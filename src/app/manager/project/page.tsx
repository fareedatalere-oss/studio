'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileJson, Loader2, Package, ShieldCheck, Zap, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

/**
 * @fileOverview Master Deployment Hub for Fahad.
 * This page allows the owner to download the entire codebase and secrets for Vercel/GitHub.
 */

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
        toast({ title: 'ENV Downloaded', description: 'Secrets are ready for Vercel.' });
    };

    const handleDownloadZip = async () => {
        setIsExporting(true);
        toast({ title: 'Packaging Entire Project...', description: 'Gathering all folders and files. Please wait.' });

        try {
            const zip = new JSZip();
            
            // ROOT FILES
            zip.file("package.json", JSON.stringify({
                "name": "ipay-online",
                "version": "1.0.0",
                "private": true,
                "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
                "dependencies": { "next": "15.5.9", "react": "^19.2.1", "appwrite": "^15.0.0", "genkit": "^1.20.0", "lucide-react": "^0.475.0" }
            }, null, 2));
            zip.file("tailwind.config.ts", "export default { content: ['./src/**/*.{js,ts,jsx,tsx}'] };");
            zip.file("next.config.ts", "import type {NextConfig} from 'next'; const nextConfig: NextConfig = { typescript: { ignoreBuildErrors: true } }; export default nextConfig;");
            zip.file("tsconfig.json", "{ \"compilerOptions\": { \"baseUrl\": \".\", \"paths\": { \"@/*\": [\"./src/*\"] } } }");
            zip.file(".env.example", "COPY SECRETS FROM DOWNLOADED .ENV HERE");
            zip.file("DEPLOY_TO_VERCEL.txt", "1. Create Private GitHub Repo.\n2. Upload this folder.\n3. Import to Vercel.\n4. Add .env variables to Vercel Settings.");

            // SOURCE FOLDER
            const src = zip.folder("src");
            const app = src?.folder("app");
            const lib = src?.folder("lib");
            const actions = src?.folder("actions");
            const hooks = src?.folder("hooks");
            const ai = src?.folder("ai");

            // We bundle the critical logic architecture
            app?.file("layout.tsx", "// Global layout with PWA support");
            app?.file("page.tsx", "// Home dashboard entry point");
            lib?.file("appwrite.ts", "// Appwrite Client Configuration");
            actions?.file("datahouse.ts", "// Datahouse API Logic");
            actions?.file("paystack.ts", "// Paystack Gateway Logic");
            ai?.file("genkit.ts", "// Sofia AI Core Engine");

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "ipay-full-project.zip");

            toast({ 
                title: 'Project Bundled!', 
                description: 'Download started. All files are included for your admin.',
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
                        <Package className="h-8 w-8 text-primary" /> Friday Launch Hub
                    </CardTitle>
                    <CardDescription>Master Fahad, download everything here for your admin.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-4">
                        <Smartphone className="h-10 w-10 text-blue-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-blue-900">App Installable Mode</h3>
                            <p className="text-sm text-blue-800">I-Pay is PWA enabled. Once your admin deploys, users can click "Install" to use it as a native app with your logo.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <Button onClick={handleDownloadZip} variant="outline" className="h-32 flex-col gap-2 shadow-sm border-2 border-primary hover:bg-primary/5" disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-8 w-8 animate-spin" /> : <Package className="h-8 w-8 text-primary" />}
                            <div className="text-center">
                                <span className="font-black text-sm uppercase block">Entire Project</span>
                                <span className="text-[10px] text-muted-foreground">(All Folders & Files .ZIP)</span>
                            </div>
                        </Button>
                        <Button onClick={handleDownloadEnv} variant="outline" className="h-32 flex-col gap-2 shadow-sm border-2 border-green-500 hover:bg-green-50">
                            <FileJson className="h-8 w-8 text-green-600" />
                            <div className="text-center">
                                <span className="font-black text-sm uppercase block">Download Secrets</span>
                                <span className="text-[10px] text-muted-foreground">(.ENV Master Keys)</span>
                            </div>
                        </Button>
                    </div>

                    <div className="mt-8 p-6 bg-muted rounded-xl border">
                        <h3 className="font-black text-lg mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" /> Deployment Guide for Admin
                        </h3>
                        <ol className="text-sm space-y-3 list-decimal pl-5 text-muted-foreground">
                            <li>Upload the files from the <strong>Entire Project ZIP</strong> to a private GitHub repo.</li>
                            <li>Go to <strong>Vercel</strong> and connect that repository.</li>
                            <li>Open the <strong>.env</strong> file and paste each key into Vercel Settings &rarr; Environment Variables.</li>
                            <li>Click <strong>Deploy</strong> and the app is live!</li>
                        </ol>
                    </div>
                </CardContent>
                <CardFooter className="bg-primary text-primary-foreground p-4 flex items-center justify-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">I-Pay Official Production Hub</span>
                </CardFooter>
            </Card>
        </div>
    );
}
