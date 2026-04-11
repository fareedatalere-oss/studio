
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UploadCloud, ShieldAlert, FileText, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_APPS, ID } from '@/lib/appwrite';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

const APP_UPLOAD_PIN = '09075464786';
const PIN_VERIFIED_KEY = 'app-upload-pin-verified';

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

function AppUploadForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();

    // Form State
    const [appName, setAppName] = useState('');
    const [description, setDescription] = useState('');
    const [platform, setPlatform] = useState('');
    const [priceType, setPriceType] = useState('free');
    const [price, setPrice] = useState('');
    
    // File State
    const [appIcon, setAppIcon] = useState<File | null>(null);
    const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
    const [appFile, setAppFile] = useState<File | null>(null);
    const [screenshots, setScreenshots] = useState<File[]>([]);
    const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
    
    // Control State
    const [isLoading, setIsLoading] = useState(false);

    const appIconInputRef = useRef<HTMLInputElement>(null);
    const appFileInputRef = useRef<HTMLInputElement>(null);
    const screenshotInputRef = useRef<HTMLInputElement>(null);

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAppIcon(file);
            setAppIconPreview(URL.createObjectURL(file));
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAppFile(e.target.files[0]);
        }
    }

    const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (screenshots.length + files.length > 8) {
                toast({ variant: 'destructive', title: 'Maximum 8 screenshots allowed.' });
                return;
            }
            setScreenshots(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setScreenshotPreviews(prev => [...prev, ...newPreviews]);
        }
    };
    
    const removeScreenshot = (index: number) => {
        setScreenshots(s => s.filter((_, i) => i !== index));
        setScreenshotPreviews(p => p.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;
        if (!appName || !appIcon || screenshots.length < 1 || !appFile || !platform) {
            toast({ variant: 'destructive', title: 'Missing required files.' });
            return;
        }

        setIsLoading(true);
        toast({ title: "Uploading to Cloudinary..." });

        try {
            const iconB64 = await toBase64(appIcon);
            const iconUp = await uploadToCloudinary(iconB64);
            if (!iconUp.success) throw new Error(iconUp.message);

            const fileB64 = await toBase64(appFile);
            const fileUp = await uploadToCloudinary(fileB64, 'raw');
            if (!fileUp.success) throw new Error(fileUp.message);

            const screenshotUrls = [];
            for (const shot of screenshots) {
                const shotB64 = await toBase64(shot);
                const shotUp = await uploadToCloudinary(shotB64);
                if (shotUp.success) screenshotUrls.push(shotUp.url);
            }
            
            const newApp = {
                name: appName,
                iconUrl: iconUp.url,
                screenshots: screenshotUrls,
                platform: platform,
                description: description,
                appFileUrl: fileUp.url,
                price: priceType === 'paid' ? Number(price) : 0,
                priceType: priceType,
                sellerId: user.$id,
                isBanned: false,
                isHidden: false,
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_APPS, ID.unique(), newApp);
            toast({ title: 'App Live!' });
            router.push('/dashboard/market?tab=apps');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Direct Upload Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

  return (
     <Card className="w-full max-w-2xl mx-auto rounded-[2rem] shadow-xl">
        <CardHeader>
            <CardTitle className="text-center font-black uppercase tracking-tighter">Upload App</CardTitle>
            <CardDescription className="text-center font-bold">List your application directly to I-Pay Market</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">App Name</Label>
                    <Input value={appName} onChange={(e) => setAppName(e.target.value)} required className="rounded-xl bg-muted/50 border-none h-12" />
                </div>
                 <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">App Icon</Label>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden"
                             onClick={() => appIconInputRef.current?.click()}
                        >
                            {appIconPreview ? (
                                <Image src={appIconPreview} alt="App Icon Preview" width={96} height={96} className="object-cover"/>
                            ) : (
                                <ImageIcon className="mx-auto h-8 w-8 opacity-30" />
                            )}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appIconInputRef.current?.click()} className="rounded-full h-10 text-[10px] font-black uppercase">Choose Icon</Button>
                    </div>
                    <Input type="file" className="hidden" ref={appIconInputRef} onChange={handleIconChange} accept="image/*" required/>
                </div>
                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">Screenshots (1-8)</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {screenshotPreviews.map((src, index) => (
                            <div key={index} className="relative aspect-square">
                                <Image src={src} alt="Shot" fill className="object-cover rounded-xl"/>
                                <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeScreenshot(index)}><X className="h-4 w-4"/></Button>
                            </div>
                        ))}
                        {screenshots.length < 8 && (
                            <div
                                className="aspect-square bg-muted rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed"
                                onClick={() => screenshotInputRef.current?.click()}
                            >
                                <UploadCloud className="h-6 w-6 opacity-30" />
                            </div>
                        )}
                    </div>
                    <Input type="file" multiple className="hidden" ref={screenshotInputRef} onChange={handleScreenshotsChange} accept="image/*" />
                </div>
                 <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">Platform</Label>
                    <Select required onValueChange={setPlatform} value={platform}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                            <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="android">Android</SelectItem>
                            <SelectItem value="ios">iOS</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="rounded-xl bg-muted/50 border-none" />
                </div>
                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">App File</Label>
                     <div
                        className={cn(
                            "h-32 bg-muted rounded-2xl flex items-center justify-center border-2 border-dashed",
                            platform ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                        )}
                        onClick={() => platform && appFileInputRef.current?.click()}
                    >
                      {appFile ? (
                          <div className="text-center">
                            <FileText className="mx-auto h-8 w-8" />
                            <p className="font-bold text-[10px] mt-2 truncate max-w-[150px]">{appFile.name}</p>
                          </div>
                      ) : (
                          <div className="text-center opacity-30">
                            <UploadCloud className="mx-auto h-8 w-8" />
                            <p className="text-[10px] font-black uppercase">Choose .apk / .ipa</p>
                          </div>
                      )}
                    </div>
                    <Input type="file" className="hidden" ref={appFileInputRef} onChange={handleFileChange} required disabled={!platform} />
                </div>
                
                <div className="space-y-3">
                    <Label className="font-black uppercase text-[10px] opacity-70">Pricing</Label>
                     <RadioGroup defaultValue="free" value={priceType} onValueChange={setPriceType} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="free" id="free" /><Label htmlFor="free">Free</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="paid" id="paid" /><Label htmlFor="paid">Paid</Label></div>
                    </RadioGroup>
                    {priceType === 'paid' && (
                        <div className='space-y-2'>
                            <Input type="number" placeholder='Price (₦)' value={price} onChange={(e) => setPrice(e.target.value)} required className="h-12 rounded-xl bg-muted/50 border-none" />
                        </div>
                    )}
                </div>
                
                <Button type="submit" className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Publish to Cloudinary"}
                </Button>
            </form>
        </CardContent>
     </Card>
  );
}

export default function UploadAppPage() {
  const [accepted, setAccepted] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  
  useEffect(() => {
    if (sessionStorage.getItem(PIN_VERIFIED_KEY) === 'true') {
        setPinVerified(true);
    }
  }, []);

  const handlePinVerify = (pin: string) => {
    if (pin === APP_UPLOAD_PIN) {
        sessionStorage.setItem(PIN_VERIFIED_KEY, 'true');
        setPinVerified(true);
    }
  };

  if (!pinVerified) {
      return (
        <div className="container py-8 max-w-md">
            <Card className="rounded-[2.5rem] p-8 shadow-2xl">
                <CardHeader><CardTitle className="text-center font-black uppercase text-sm">Security Gate</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Input type="password" placeholder="Enter Upload PIN" onChange={(e) => handlePinVerify(e.target.value)} className="h-14 rounded-2xl text-center text-2xl tracking-widest" />
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="container py-8">
      <Link href="/dashboard/market?tab=apps" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <AppUploadForm />
    </div>
  );
}
