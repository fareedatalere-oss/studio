'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl, ID } from '@/lib/appwrite';


export default function UploadReelsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { user: authUser, profile: userProfile } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 200 * 1024 * 1024) { // 200MB limit
          toast({
              variant: 'destructive',
              title: 'File too large',
              description: 'Reels cannot be larger than 200MB.'
          });
          return;
      }
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
     if (!videoFile || !authUser || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing video or user data.' });
      return;
    }
    setIsPosting(true);
    toast({ title: 'Posting reel...' });

    try {
        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), videoFile);
        const mediaUrl = getAppwriteStorageUrl(uploadResult.$id);

        const newPost = {
            userId: authUser.$id,
            username: userProfile.username,
            userAvatar: userProfile.avatar,
            type: 'reels',
            mediaUrl: mediaUrl,
            description: description,
            allowComments: true, // Default settings for reels
            allowDownload: true,
            likes: [],
            commentCount: 0,
        };
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
        toast({ title: 'Reel Posted!', description: 'Your reel is now live.' });
        router.push('/dashboard/media');

    } catch(error: any) {
        console.error("Post creation failed:", error);
        toast({ title: 'Post Failed', description: error.message || 'Could not post your reel.', variant: 'destructive' });
        setIsPosting(false);
    }
  };

  return (
    <div className="container py-8">
      <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Media
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Upload a Reel</CardTitle>
          <CardDescription>Share a short video (up to 3 minutes).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoSrc ? (
            <div className='space-y-4'>
                <video src={videoSrc} controls className="w-full rounded-md" />
                <Textarea
                    placeholder="Write a caption..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
          ) : (
            <div className="space-y-2">
                <Button onClick={() => cameraInputRef.current?.click()} variant="outline" className="w-full justify-start gap-2">
                    <Camera className="h-5 w-5" /> Use Camera
                </Button>
                 <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full justify-start gap-2">
                    <UploadCloud className="h-5 w-5" /> From Device
                </Button>
                 <p className="text-xs text-muted-foreground text-center pt-2">MP4, MOV, etc. up to 200MB</p>
            </div>
          )}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="video/*"
            capture="environment"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="video/*"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handlePost} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg" disabled={!videoFile || isPosting}>
            {isPosting ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Posting...</> : 'Post Reel'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}