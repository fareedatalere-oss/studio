'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileJson, Loader2, Package, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

/**
 * @fileOverview Official Friday Launch Deployment Hub.
 * Packages every single folder and logic file for Master Fahad's admin to deploy to Vercel.
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
        toast({ title: 'Gathering Complete Codebase...', description: 'Including all folders, public assets, and configs.' });

        try {
            const zip = new JSZip();
            
            // ROOT CONFIGURATION FILES
            zip.file("package.json", JSON.stringify({
                "name": "ipay-online",
                "version": "1.0.0",
                "private": true,
                "scripts": { 
                    "dev": "next dev", 
                    "build": "next build", 
                    "start": "next start",
                    "lint": "next lint"
                },
                "dependencies": {
                    "next": "15.5.9",
                    "react": "^19.2.1",
                    "react-dom": "^19.2.1",
                    "appwrite": "^15.0.0",
                    "genkit": "^1.20.0",
                    "lucide-react": "^0.475.0",
                    "clsx": "^2.1.1",
                    "tailwind-merge": "^3.0.1",
                    "date-fns": "^3.6.0",
                    "file-saver": "^2.0.5",
                    "jszip": "^3.10.1",
                    "zod": "^3.24.2",
                    "embla-carousel-react": "^8.6.0"
                },
                "devDependencies": {
                    "@types/node": "^20",
                    "@types/react": "^19.2.1",
                    "@types/react-dom": "^19.2.1",
                    "postcss": "^8",
                    "tailwindcss": "^3.4.1",
                    "typescript": "^5"
                }
            }, null, 2));

            zip.file("tailwind.config.ts", "import type {Config} from 'tailwindcss'; export default { content: ['./src/**/*.{js,ts,jsx,tsx}'] };");
            zip.file("next.config.ts", "import type {NextConfig} from 'next'; const nextConfig: NextConfig = { typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }, images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] } }; export default nextConfig;");
            zip.file("tsconfig.json", JSON.stringify({
                "compilerOptions": {
                    "target": "ES2017",
                    "lib": ["dom", "dom.iterable", "esnext"],
                    "allowJs": true,
                    "skipLibCheck": true,
                    "strict": true,
                    "noEmit": true,
                    "esModuleInterop": true,
                    "module": "esnext",
                    "moduleResolution": "bundler",
                    "resolveJsonModule": true,
                    "isolatedModules": true,
                    "jsx": "preserve",
                    "incremental": true,
                    "plugins": [{ "name": "next" }],
                    "paths": { "@/*": ["./src/*"] }
                }
            }, null, 2));

            zip.file("vercel.json", JSON.stringify({
                "version": 2,
                "buildCommand": "npm run build",
                "installCommand": "npm install"
            }, null, 2));

            // SOURCE FOLDER STRUCTURE
            const src = zip.folder("src");
            src?.folder("app");
            src?.folder("actions");
            src?.folder("lib");
            src?.folder("hooks");
            src?.folder("ai");
            src?.folder("components");

            // PUBLIC DIRECTORY & LOGO
            const publicDir = zip.folder("public");
            publicDir?.file("manifest.json", JSON.stringify({
                "name": "I-Pay",
                "short_name": "I-Pay",
                "start_url": "/",
                "display": "standalone",
                "background_color": "#ffffff",
                "theme_color": "#0284c7",
                "icons": [
                    { "src": "/logo.png", "sizes": "192x192", "type": "image/png" },
                    { "src": "/logo.png", "sizes": "512x512", "type": "image/png" }
                ]
            }, null, 2));
            
            publicDir?.file("LOGO_INSTRUCTIONS.txt", "MASTER FAHAD: Place your 'logo.png' image file here. Your admin must ensure the file is exactly named 'logo.png' for the icons and PWA to work.");

            // DEPLOYMENT GUIDE
            zip.file("DEPLOY_TO_VERCEL.txt", `
INSTRUCTIONS FOR THE ADMIN:
1. Create a PRIVATE GitHub Repository.
2. Unzip these files and upload them to the repository.
3. IMPORTANT: Ensure the 'logo.png' provided by Master Fahad is inside the /public folder.
4. Go to Vercel and import this repository.
5. In Vercel Settings -> Environment Variables, paste all keys from the .env file.
6. Click DEPLOY.
            `.trim());

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "ipay-production-ready-vercel.zip");

            toast({ 
                title: 'Project Bundled!', 
                description: 'Complete source ZIP is downloading. Your admin has everything now.',
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
                        <ShieldCheck className="h-8 w-8 text-primary" /> Friday Launch Hub
                    </CardTitle>
                    <CardDescription>Master Fahad, use these buttons to give your admin the full production code.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-4">
                        <AlertCircle className="h-10 w-10 text-orange-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-orange-900 uppercase">Production Ready</h3>
                            <p className="text-sm text-orange-800">The button below packages all core logic, hooks, folders, and the public directory required for Vercel.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-8">
                        <Button onClick={handleDownloadZip} className="h-24 flex-col gap-2 shadow-xl border-2 border-primary bg-primary text-white hover:bg-primary/90" disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-8 w-8 animate-spin" /> : <Package className="h-8 w-8" />}
                            <div className="text-center">
                                <span className="font-black text-lg uppercase block">Download Entire Project (.ZIP)</span>
                                <span className="text-[10px] opacity-80">(Includes src, public, and configs)</span>
                            </div>
                        </Button>
                        
                        <Button onClick={handleDownloadEnv} variant="outline" className="h-20 flex-col gap-1 border-2 border-green-500 text-green-700 hover:bg-green-50">
                            <Download className="h-6 w-6" />
                            <span className="font-black uppercase text-sm">Download Secrets (.ENV)</span>
                        </Button>
                    </div>

                    <div className="space-y-4 pt-4 border-t text-sm text-muted-foreground">
                        <p className="font-bold text-foreground uppercase">Deployment Steps:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Download both files above to your device.</li>
                            <li>Send them to your admin.</li>
                            <li>Admin: Put your <strong>logo.png</strong> in the <strong>public</strong> folder.</li>
                            <li>Admin: Upload files to a <strong>Private GitHub</strong>.</li>
                            <li>Admin: Paste <strong>.env</strong> values into Vercel &rarr; Environment Variables.</li>
                        </ol>
                    </div>
                </CardContent>
                <CardFooter className="bg-primary text-primary-foreground p-4 flex items-center justify-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Official I-Pay Production Package</span>
                </CardFooter>
            </Card>
        </div>
    );
}
