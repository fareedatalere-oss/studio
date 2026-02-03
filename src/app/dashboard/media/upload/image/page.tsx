'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Download, Settings, UploadCloud, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function UploadImagePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings.',
            });
          }
        };
        getCameraPermission();
    } else {
        // Stop camera stream when leaving the upload step
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [step, toast]);
  
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

  const handlePublish = () => {
    toast({
      title: 'Posted!',
      description: 'Your image is now live.',
    });
    router.push('/dashboard/media');
  };

  if (step === 2) {
    return (
      <div className="container py-8">
        <Button onClick={() => { setStep(1); setImageSrc(null);}} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Preview & Post</CardTitle>
            <CardDescription>Add a description and adjust settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {imageSrc && (
              <Image src={imageSrc} alt="Preview" width={400} height={400} className="rounded-md object-contain w-full" />
            )}
            <Textarea
              placeholder="Write a caption..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="space-y-2 pt-4">
              <Label className="flex items-center"><Settings className="mr-2 h-4 w-4" /> Settings</Label>
               <div className="flex items-center justify-between">
                <Label htmlFor="allow-comments">Allow Comments</Label>
                <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-download">Allow Download</Label>
                <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handlePublish} className="w-full">
              Post
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
       <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Media
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Upload an Image</CardTitle>
          <CardDescription>Use your camera or upload a file from your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
             <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
             <canvas ref={canvasRef} className="hidden" />
          </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <Camera className="h-4 w-4" />
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    To take a photo, please allow camera access in your browser settings.
                  </AlertDescription>
                </Alert>
             )}
          <div className="flex gap-4">
            <Button onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}>
              <Camera className="mr-2 h-4 w-4" />
              Use Camera
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
              <UploadCloud className="mr-2 h-4 w-4" />
              From Device
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
