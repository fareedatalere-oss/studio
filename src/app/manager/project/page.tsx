
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2, Package, ShieldCheck, Copy, CheckCircle2, Globe, Cloud, Zap } from 'lucide-react';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

export default function ProjectExportPage() {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const envTemplate = `
# --- I-PAY ONLINE WORLD CORE CONFIG ---
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# --- FIREBASE CONFIG (REQUIRED FOR SIGN IN/SIGN UP) ---
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# --- CLOUDINARY CONFIG (FOR MEDIA & AVATARS) ---
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dwhkwiceh
NEXT_PUBLIC_CLOUDINARY_API_KEY=483123493357221
CLOUDINARY_API_SECRET=c4R2hTEJ08hRl9i_tMr52yhJV-M

# --- GOOGLE AI (FOR SOFIA BRAIN) ---
GOOGLE_GENAI_API_KEY=YOUR_GEMINI_API_KEY

# --- PAYMENT SECRETS ---
FLUTTERWAVE_SECRET_KEY=YOUR_FLUTTERWAVE_KEY
PAYSTACK_SECRET_KEY=YOUR_PAYSTACK_KEY
DATAHOUSE_TOKEN=80ca2a529de4afa096c4eabefeb275dafe3a8941
`.trim();

    const handleCopyEnv = () => {
        navigator.clipboard.writeText(envTemplate);
        setCopied(true);
        toast({ title: "Config Copied!" });
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="container py-8 max-w-4xl">
            <Button asChild variant="ghost" className="mb-6 font-black uppercase text-[10px]">
                <Link href="/manager/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
            </Button>

            <Card className="border-t-8 border-t-primary shadow-2xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="text-center bg-muted/30 pb-10 pt-10">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                        <Zap className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Vercel Environment Master</CardTitle>
                    <CardDescription className="font-bold text-sm">Essential keys for Cloudinary, Firebase, and AI</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <Cloud className="h-5 w-5 text-orange-600 mb-2" />
                            <p className="text-[10px] font-black uppercase text-orange-800">Cloudinary</p>
                            <p className="text-[8px] font-bold text-orange-700/70">Handles all photo, video, and audio uploads instantly.</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <ShieldCheck className="h-5 w-5 text-blue-600 mb-2" />
                            <p className="text-[10px] font-black uppercase text-blue-800">Firebase</p>
                            <p className="text-[8px] font-bold text-blue-700/70">Manages Secure Sign-In, Sign-Up, and Database records.</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                            <Globe className="h-5 w-5 text-purple-600 mb-2" />
                            <p className="text-[10px] font-black uppercase text-purple-800">Google AI</p>
                            <p className="text-[8px] font-bold text-purple-700/70">Powers Sofia's intelligence and real-time responses.</p>
                        </div>
                    </div>

                    <div className="bg-muted rounded-3xl p-6 relative border-2 border-black/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Production .env Template</span>
                            <Button size="sm" variant="ghost" onClick={handleCopyEnv} className="h-8 rounded-full font-black uppercase text-[9px] gap-2">
                                {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                {copied ? 'Copied' : 'Copy Template'}
                            </Button>
                        </div>
                        <pre className="text-[9px] font-mono leading-relaxed overflow-x-auto whitespace-pre p-4 bg-black/5 rounded-xl text-primary">
                            {envTemplate}
                        </pre>
                    </div>

                    <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20">
                        <h3 className="font-black uppercase text-xs text-primary mb-3">Vercel Setup Steps:</h3>
                        <ol className="text-[11px] font-bold space-y-2 list-decimal pl-5 opacity-80">
                            <li>Login to **Vercel Dashboard**.</li>
                            <li>Open your I-Pay project and go to **Settings**.</li>
                            <li>Click **Environment Variables** on the left.</li>
                            <li>Add the keys from the template above one by one.</li>
                            <li>Hit **Save** and trigger a **Redeploy**.</li>
                        </ol>
                    </div>
                </CardContent>
                
                <CardFooter className="bg-primary p-6 text-center text-white">
                    <p className="w-full text-[9px] font-black uppercase tracking-[0.3em]">Master Fahad: Production Deployment Hub v5.0</p>
                </CardFooter>
            </Card>
        </div>
    );
}
