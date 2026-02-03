'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function UploadReelsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // 3 minutes = 180 seconds. Approx 200MB for a 720p video.
      if (file.size > 200 * 1024 * 1024) {
          toast({
              variant: 'destructive',
              title: 'File too large',
              description: 'Reels cannot be larger than 200MB.'
          });
          return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setVideoSrc(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    toast({
      title: 'Reel Posted!',
      description: 'Your reel is being processed and will be live shortly.',
    });
    router.push('/dashboard/media');
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
            <div
              className="aspect-video bg-muted rounded-md flex items-center justify-center cursor-pointer border-2 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center text-muted-foreground">
                <UploadCloud className="mx-auto h-12 w-12" />
                <p>Click to upload a video</p>
                <p className="text-xs">MP4, MOV, etc. up to 200MB</p>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="video/*"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handlePost} className="w-full" disabled={!videoSrc}>
            Post Reel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
