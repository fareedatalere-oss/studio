
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Settings, UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, storage, BUCKET_ID_UPLOADS, ID } from '@/lib/appwrite';

function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export default function UploadImagePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>();
  const [isPosting, setIsPosting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user: authUser, profile: userProfile } = useUser();

  useEffect(() => {
    if (step === 1) {
        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
          }
        };
        getCameraPermission();
    }
  }, [step]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setImageSrc(loadEvent.target?.result as string);
        setStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/png');
      setImageSrc(dataUrl);
      setStep(2);
    }
  };

  const handlePublish = async () => {
    if (!imageSrc || !authUser?.$id || !userProfile) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'Please complete your profile first.' });
      return;
    }

    setIsPosting(true);
    try {
      const fileToUpload = dataURLtoFile(imageSrc, 'upload.png');
      const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), fileToUpload);
      
      const newPost = {
        userId: authUser.$id,
        username: userProfile.username,
        userAvatar: userProfile.avatar,
        type: 'image',
        mediaUrl: uploadResult.url,
        description: description,
        allowComments: allowComments,
        allowDownload: allowDownload,
        likes: [],
        commentCount: 0,
      };
      
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
      toast({ title: 'Success!', description: 'Your image has been shared.' });
      router.push('/dashboard/media');
    } catch (error: any) {
      setIsPosting(false);
      toast({ variant: 'destructive', title: 'Post Failed', description: error.message || 'Check your internet connection.' });
    }
  };

  if (step === 2) {
    return (
      <div className="container py-8">
        <Button onClick={() => { setStep(1); setImageSrc(null);}} variant="ghost" className="mb-4 font-black uppercase text-[10px]">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card className="w-full max-w-lg mx-auto rounded-[2rem] shadow-xl overflow-hidden border-none">
          <CardHeader className="bg-primary/5 pb-6">
            <CardTitle className="text-xl font-black uppercase tracking-tighter text-center">Preview & Post</CardTitle>
            <CardDescription className="text-center font-bold">Review your image before sharing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {imageSrc && (
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-md">
                <Image src={imageSrc} alt="Preview" fill className="object-cover" />
              </div>
            )}
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] opacity-70 tracking-widest">Caption</Label>
                <Textarea
                    placeholder="Write something catchy..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl bg-muted/50 border-none min-h-[100px]"
                />
            </div>
            <div className="space-y-4 pt-4 border-t border-dashed">
              <Label className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-50"><Settings className="h-3 w-3" /> Options</Label>
               <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <Label htmlFor="allow-comments" className="font-bold text-sm">Allow Comments</Label>
                <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <Label htmlFor="allow-download" className="font-bold text-sm">Enable Download</Label>
                <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-muted/30">
            <Button onClick={handlePublish} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isPosting}>
              {isPosting ? <Loader2 className="animate-spin" /> : 'Share Image'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
       <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Card className="w-full max-w-lg mx-auto rounded-[2rem] shadow-xl overflow-hidden border-none">
        <CardHeader className="bg-primary/5 pb-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-center">New Image Post</CardTitle>
          <CardDescription className="text-center font-bold">Capture or upload from gallery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="aspect-square bg-muted rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-inner relative">
             <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
             <canvas ref={canvasRef} className="hidden" />
             {hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-6 text-center">
                    <Alert variant="destructive" className="rounded-2xl border-none shadow-2xl">
                        <Camera className="h-4 w-4 mx-auto mb-2" />
                        <AlertTitle className="font-black uppercase text-xs">Permission Required</AlertTitle>
                        <AlertDescription className="text-[10px] font-bold">Please allow camera access in your settings.</AlertDescription>
                    </Alert>
                </div>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleCapture} className="h-16 rounded-3xl font-black uppercase text-[10px] flex-col gap-1 shadow-lg" disabled={!hasCameraPermission}>
              <Camera className="h-6 w-6" />
              Capture
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="h-16 rounded-3xl font-black uppercase text-[10px] flex-col gap-1 shadow-md">
              <UploadCloud className="h-6 w-6" />
              Gallery
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
