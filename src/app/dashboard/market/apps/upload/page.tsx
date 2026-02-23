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
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_APPS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID } from 'appwrite';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const APP_UPLOAD_PIN = '09075464786';
const PIN_VERIFIED_KEY = 'app-upload-pin-verified';


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

        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in to post.' });
            return;
        }

        if (!appName || !appIcon || screenshots.length < 3 || !appFile || !platform || !description || (priceType === 'paid' && !price)) {
            toast({ variant: 'destructive', title: 'Please fill all required fields and upload all files.' });
            return;
        }

        setIsLoading(true);
        toast({ title: "Submitting your app...", description: "Uploading files and creating your listing. Please wait." });

        try {
            const uploadPromises = [
                storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), appIcon),
                ...screenshots.map(file => storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file)),
                storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), appFile),
            ];

            const [appIconUpload, ...otherUploads] = await Promise.all(uploadPromises);
            const screenshotUploads = otherUploads.slice(0, screenshots.length);
            const appFileUpload = otherUploads[screenshots.length];
            
            const newApp = {
                name: appName,
                iconUrl: getAppwriteStorageUrl(appIconUpload.$id),
                screenshots: screenshotUploads.map(upload => getAppwriteStorageUrl(upload.$id)),
                platform: platform,
                description: description,
                appFileUrl: getAppwriteStorageUrl(appFileUpload.$id),
                price: priceType === 'paid' ? Number(price) : 0,
                priceType: priceType,
                sellerId: user.$id,
                isBanned: false,
                isHidden: false,
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_APPS, ID.unique(), newApp);
            
            toast({ title: 'App Submitted!', description: 'Your app is now live on the marketplace.' });
            router.push('/dashboard/market?tab=apps');

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'An unknown error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }

  return (
     <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Upload Your App</CardTitle>
            <CardDescription>Fill in the details below to list your application on the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="appName">App Name</Label>
                    <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g., I-Pay Connect" required/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="appIcon">App Icon</Label>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-24 h-24 bg-muted rounded-md flex items-center justify-center cursor-pointer border border-dashed"
                             onClick={() => appIconInputRef.current?.click()}
                        >
                            {appIconPreview ? (
                                <Image src={appIconPreview} alt="App Icon Preview" width={96} height={96} className="object-cover rounded-md"/>
                            ) : (
                                <div className="text-center text-muted-foreground p-2">
                                    <ImageIcon className="mx-auto h-8 w-8" />
                                    <p className='text-xs'>Upload Icon</p>
                                </div>
                            )}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appIconInputRef.current?.click()}>Choose Image</Button>
                    </div>
                    <Input id="appIcon" type="file" className="hidden" ref={appIconInputRef} onChange={handleIconChange} accept="image/png, image/jpeg, image/webp" required/>
                </div>
                <div className="space-y-2">
                    <Label>Screenshots (3-8 images)</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {screenshotPreviews.map((src, index) => (
                            <div key={index} className="relative aspect-square">
                                <Image src={src} alt={`Screenshot ${index + 1}`} fill className="object-cover rounded-md"/>
                                <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeScreenshot(index)}><X className="h-4 w-4"/></Button>
                            </div>
                        ))}
                        {screenshots.length < 8 && (
                            <div
                                className="aspect-square bg-muted rounded-md flex items-center justify-center cursor-pointer border-2 border-dashed"
                                onClick={() => screenshotInputRef.current?.click()}
                            >
                                <div className="text-center text-muted-foreground">
                                    <UploadCloud className="mx-auto h-8 w-8" />
                                    <p className='text-xs'>Upload</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <Input id="screenshots" type="file" multiple className="hidden" ref={screenshotInputRef} onChange={handleScreenshotsChange} accept="image/png, image/jpeg, image/webp" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select required onValueChange={setPlatform} value={platform}>
                        <SelectTrigger id="platform">
                            <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="android">Android</SelectItem>
                            <SelectItem value="ios">iOS</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="description">App Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what your app does..." required rows={4}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="appFile">Application File</Label>
                     <div
                        className={cn(
                            "h-32 bg-muted rounded-md flex items-center justify-center border-2 border-dashed",
                            platform ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                        )}
                        onClick={() => platform && appFileInputRef.current?.click()}
                    >
                      {appFile ? (
                          <div className="text-center text-foreground">
                            <FileText className="mx-auto h-10 w-10" />
                            <p className="font-semibold mt-2">{appFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(appFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                      ) : (
                          <div className="text-center text-muted-foreground">
                            <UploadCloud className="mx-auto h-10 w-10" />
                            <p>Click or drag file to upload</p>
                            {platform === 'android' && <p className="text-xs">.apk, .aab</p>}
                            {platform === 'ios' && <p className="text-xs">.ipa file</p>}
                            {!platform && <p className="text-xs">Select a platform first</p>}
                          </div>
                      )}
                    </div>
                    <Input 
                        id="appFile" 
                        type="file" 
                        className="hidden"
                        ref={appFileInputRef}
                        onChange={handleFileChange}
                        required 
                        disabled={!platform}
                        accept={
                            platform === 'ios' ? '.ipa' : 
                            platform === 'android' ? '.apk,.aab' : '*'
                        }
                    />
                </div>
                
                <div className="space-y-3">
                    <Label>Pricing</Label>
                     <RadioGroup defaultValue="free" value={priceType} onValueChange={setPriceType} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="free" id="free" />
                            <Label htmlFor="free">Free</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="paid" id="paid" />
                            <Label htmlFor="paid">Paid</Label>
                        </div>
                    </RadioGroup>
                    {priceType === 'paid' && (
                        <div className='space-y-2'>
                            <Label htmlFor="price">Price (₦)</Label>
                            <Input id="price" type="number" placeholder='e.g., 500' value={price} onChange={(e) => setPrice(e.target.value)} required/>
                            <p className="text-xs text-muted-foreground">A fee of ₦80 will be deducted from each sale.</p>
                        </div>
                    )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting App...</> : "Post App"}
                </Button>
            </form>
        </CardContent>
     </Card>
  );
}

function PinGate({ onPinVerified }: { onPinVerified: () => void }) {
    const [pin, setPin] = useState('');
    const { toast } = useToast();

    const handleVerify = () => {
        if (pin === APP_UPLOAD_PIN) {
            sessionStorage.setItem(PIN_VERIFIED_KEY, 'true');
            toast({ title: 'PIN Verified' });
            onPinVerified();
        } else {
            toast({ variant: 'destructive', title: 'Incorrect PIN' });
        }
    };
    
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Enter App Upload PIN</CardTitle>
                <CardDescription>A one-time PIN is required to access the app upload section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                 <Label htmlFor="upload-pin">Upload PIN</Label>
                 <Input id="upload-pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
            </CardContent>
            <CardFooter>
                <Button onClick={handleVerify} className="w-full">Continue</Button>
            </CardFooter>
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

  const PageContent = () => {
    if (!pinVerified) {
        return <PinGate onPinVerified={() => setPinVerified(true)} />;
    }
    if (!accepted) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-6 w-6 text-destructive" />
                  Important: App Submission Rules
                </CardTitle>
                <CardDescription>Please read these terms carefully before uploading your application.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTitle>Warning!</AlertTitle>
                  <AlertDescription>
                    We take the security of our users very seriously. Uploading fake applications, malware, or any form of malicious software is strictly prohibited and will result in a permanent ban from our platform.
                  </AlertDescription>
                </Alert>
                <div className="text-sm text-muted-foreground space-y-2">
                    <p>By proceeding, you agree to the following:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You are the rightful owner or have explicit permission to distribute the application you are uploading.</li>
                        <li>Your application does not contain any malicious code, viruses, or spyware.</li>
                        <li>All transactions made through the marketplace are subject to a service charge for both the buyer and the seller. This is to maintain the platform and ensure a secure environment.</li>
                        <li>Violating these terms will lead to immediate account suspension and potential legal action.</li>
                    </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setAccepted(true)} className="w-full">I have read and agree to the terms</Button>
              </CardFooter>
            </Card>
        );
    }
    return <AppUploadForm />;
  }

  return (
    <div className="container py-8">
      <Link href="/dashboard/market?tab=apps" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Market
      </Link>
      
      <PageContent />
    </div>
  );
}
