
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2, Package, ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

export default function ProjectExportPage() {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const envTemplate = `
# --- I-PAY CORE CONFIGURATION ---
NEXT_PUBLIC_APP_URL=https://ipay-online.vercel.app

# --- FIREBASE SECRETS (REQUIRED) ---
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# --- CLOUDINARY (MEDIA UPLOADS) ---
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dwhkwiceh
NEXT_PUBLIC_CLOUDINARY_API_KEY=483123493357221
CLOUDINARY_API_SECRET=c4R2hTEJ08hRl9i_tMr52yhJV-M

# --- BANKING & RECHARGE ---
FLUTTERWAVE_SECRET_KEY=YOUR_SECRET_KEY
PAYSTACK_SECRET_KEY=YOUR_SECRET_KEY
DATAHOUSE_TOKEN=80ca2a529de4afa096c4eabefeb275dafe3a8941

# --- AI BRAIN (SOFIA) ---
GOOGLE_GENAI_API_KEY=YOUR_GEMINI_API_KEY
`.trim();

    const handleCopyEnv = () => {
        navigator.clipboard.writeText(envTemplate);
        setCopied(true);
        toast({ title: "Template Copied!" });
        setTimeout(() => setCopied(false), 3000);
    };

    const handleDownloadEnv = () => {
        const blob = new Blob([envTemplate], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, '.env.production');
    };

    return (
        <div className="container py-8 max-w-3xl">
            <Button asChild variant="ghost" className="mb-6 font-black uppercase text-[10px]">
                <Link href="/manager/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
            </Button>

            <Card className="border-t-8 border-t-primary shadow-2xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="text-center bg-muted/30 pb-10 pt-10">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Deployment Hub</CardTitle>
                    <CardDescription className="font-bold text-sm">Vercel Environment Variable Master Guide</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8 pt-8">
                    <div className="grid gap-4">
                        <div className="p-6 bg-destructive/5 rounded-3xl border-2 border-dashed border-destructive/20">
                            <h3 className="font-black uppercase text-xs text-destructive mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" /> Vercel Setup Instructions
                            </h3>
                            <ol className="text-[11px] font-bold space-y-3 list-decimal pl-5 opacity-80 leading-relaxed">
                                <li>Go to your project on **vercel.com**.</li>
                                <li>Navigate to **Settings > Environment Variables**.</li>
                                <li>Copy the template below and paste the keys one by one.</li>
                                <li>Ensure **NEXT_PUBLIC_** prefix is included for client-side keys.</li>
                                <li>Redeploy your application to apply changes.</li>
                            </ol>
                        </div>

                        <div className="bg-muted rounded-3xl p-6 relative group border-2 border-black/5">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">.env Template</span>
                                <Button size="sm" variant="ghost" onClick={handleCopyEnv} className="h-8 rounded-full font-black uppercase text-[9px] gap-2">
                                    {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    {copied ? 'Copied' : 'Copy Template'}
                                </Button>
                            </div>
                            <pre className="text-[9px] font-mono leading-relaxed overflow-x-auto whitespace-pre p-4 bg-black/5 rounded-xl">
                                {envTemplate}
                            </pre>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={handleDownloadEnv} variant="outline" className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">
                            <Download className="mr-2 h-4 w-4" /> Download .env
                        </Button>
                        <Button asChild className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                            <Link href="/manager/your-app">
                                <Code2 className="mr-2 h-4 w-4" /> Export Project
                            </Link>
                        </Button>
                    </div>
                </CardContent>
                
                <CardFooter className="bg-primary p-6 text-center text-white">
                    <p className="w-full text-[9px] font-black uppercase tracking-[0.3em]">Master Fahad: Security & Deployment Engine v4.0</p>
                </CardFooter>
            </Card>
        </div>
    );
}
