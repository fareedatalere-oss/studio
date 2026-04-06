
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, Camera, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, storage, BUCKET_ID_UPLOADS, ID } from '@/lib/appwrite';

export default function UploadReelsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);

  const { user: authUser, profile: userProfile } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 200 * 1024 * 1024) { 
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
    toast({ title: 'Posting reel...', description: 'Please wait while we upload your video.' });

    try {
        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), videoFile);
        const mediaUrl = uploadResult.url;

        const newPost = {
            userId: authUser.$id,
            username: userProfile.username,
            userAvatar: userProfile.avatar,
            type: 'reels',
            mediaUrl: mediaUrl,
            description: description,
            allowComments: allowComments,
            allowDownload: allowDownload,
            likes: [],
            commentCount: 0,
        };
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
        toast({ title: 'Reel Posted!', description: 'Your reel is now live on the feed.' });
        router.push('/dashboard/media');

    } catch(error: any) {
        console.error("Post creation failed:", error);
        toast({ title: 'Post Failed', description: error.message || 'Could not post your reel.', variant: 'destructive' });
        setIsPosting(false);
    }
  };

  return (
    <div className="container py-8">
      <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Media
      </Link>
      <Card className="w-full max-w-lg mx-auto rounded-[2rem] shadow-xl overflow-hidden border-none">
        <CardHeader className="bg-primary/5 pb-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-center">Upload Reel</CardTitle>
          <CardDescription className="text-center font-bold">Share short vertical videos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {videoSrc ? (
            <div className='space-y-6'>
                <div className="relative aspect-[9/16] w-full max-w-[280px] mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-white">
                    <video src={videoSrc} controls className="w-full h-full object-cover" />
                </div>
                {isPosting && <div className="space-y-2"><Progress value={45} className="h-2" /><p className="text-[10px] text-center font-black uppercase text-primary animate-pulse">Uploading Video Logic...</p></div>}
                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70 tracking-widest">Caption</Label>
                    <Textarea
                        placeholder="Write a caption for your reel..."
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
            </div>
          ) : (
            <div className="grid gap-4 py-10">
                <Button onClick={() => cameraInputRef.current?.click()} variant="outline" className="h-20 rounded-[2rem] flex-col gap-1 font-black uppercase text-[10px] shadow-sm">
                    <Camera className="h-6 w-6 text-primary" />
                    Record Reel
                </Button>
                 <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-20 rounded-[2rem] flex-col gap-1 font-black uppercase text-[10px] shadow-sm">
                    <UploadCloud className="h-6 w-6 text-primary" />
                    Select from Files
                </Button>
                 <p className="text-[10px] text-muted-foreground text-center font-bold px-10">Supports MP4, MOV, etc. Maximum file size: 200MB.</p>
            </div>
          )}
          <input type="file" ref={cameraInputRef} onChange={handleFileChange} className="hidden" accept="video/*" capture="environment" />
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />
        </CardContent>
        {videoSrc && (
            <CardFooter className="p-6 bg-muted/30">
                <Button onClick={handlePost} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isPosting}>
                    {isPosting ? <Loader2 className="animate-spin" /> : 'Post Reel'}
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
