'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, PenSquare, Settings, Headset, Camera, UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState({
    name: 'johndoe',
    avatar: 'https://picsum.photos/seed/102/200/200',
    followers: 1200,
    following: 340,
    likes: '10.5k',
  });
  const [openCamera, setOpenCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openCamera) {
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
    } else {
      // Stop camera stream when dialog is closed
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [openCamera]);

  const handleLogout = () => {
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    router.push('/auth/signin');
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const newAvatarUrl = loadEvent.target?.result as string;
        setUser(prev => ({ ...prev, avatar: newAvatarUrl }));
        toast({ title: 'Avatar Updated!' });
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
      setUser(prev => ({ ...prev, avatar: dataUrl }));
      setOpenCamera(false);
      toast({ title: 'Avatar Updated!' });
    }
  };

  const actions = [
    { label: 'Settings', icon: Settings, href: '/dashboard/profile/settings' },
    { label: 'Contact Support', icon: Headset, href: '/dashboard/profile/support' },
    { label: 'Post', icon: PenSquare, href: '/dashboard/media' }, // Assuming it links to media for now
  ];

  return (
    <div className="container py-8">
      <div className="flex flex-col items-center space-y-4">
        <Dialog>
            <DialogTrigger asChild>
                <Avatar className="h-24 w-24 cursor-pointer">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
            </DialogTrigger>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Profile Avatar</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 py-4">
                    <Dialog open={openCamera} onOpenChange={setOpenCamera}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Camera className="mr-2"/> Use Camera</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Camera</DialogTitle>
                            </DialogHeader>
                            <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                            {hasCameraPermission === false && (
                                <Alert variant="destructive">
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>Please enable camera access in browser settings.</AlertDescription>
                                </Alert>
                            )}
                            <DialogClose asChild>
                                <Button onClick={handleCapture} disabled={!hasCameraPermission}>Capture</Button>
                            </DialogClose>
                        </DialogContent>
                    </Dialog>
                    
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="mr-2"/> Upload from Device
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
            </DialogContent>
        </Dialog>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">@{user.name}</h1>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="flex justify-around p-4 text-center">
            <Link href="/dashboard/profile/connections?tab=followers" className="flex-1">
              <p className="font-bold text-lg">{user.followers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </Link>
            <Link href="/dashboard/profile/connections?tab=following" className="flex-1">
              <p className="font-bold text-lg">{user.following.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </Link>
            <div>
              <p className="font-bold text-lg">{user.likes}</p>
              <p className="text-sm text-muted-foreground">Likes</p>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-md space-y-2">
          {actions.map((action) => (
            <Button asChild key={action.label} className="w-full justify-start gap-3">
                <Link href={action.href}>
                    <action.icon className="h-5 w-5" />
                    <span>{action.label}</span>
                </Link>
            </Button>
          ))}
          <Button onClick={handleLogout} className="w-full justify-start gap-3" variant="destructive">
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
