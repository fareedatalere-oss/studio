'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';


export default function UploadFilmPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // 5 hours of 1080p video could be very large, let's set a prototype limit of 2GB.
      if (file.size > 2 * 1024 * 1024 * 1024) {
          toast({
              variant: 'destructive',
              title: 'File too large',
              description: 'For this prototype, films cannot be larger than 2GB.'
          });
          return;
      }
      setVideoFile(file);
    }
  };

  const handlePost = () => {
    // Simulate upload progress
    const interval = setInterval(() => {
        setUploadProgress(prev => {
            if (prev >= 95) {
                clearInterval(interval);
                return 100;
            }
            return prev + 5;
        })
    }, 500);

    setTimeout(() => {
         toast({
            title: 'Film Uploaded!',
            description: 'Your film is processing and will be live shortly.',
        });
        router.push('/dashboard/media');
    }, 11000);
  };

  return (
    <div className="container py-8">
      <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Media
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Upload a Film</CardTitle>
          <CardDescription>Share your movie (up to 5 hours).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoFile ? (
            <div className='space-y-4'>
                <div className="border p-4 rounded-md">
                    <p className="font-semibold">{videoFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {uploadProgress > 0 && <Progress value={uploadProgress} />}
                <Textarea
                    placeholder="Add a film synopsis or description..."
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                 <div className="space-y-2 pt-4">
                    <Label className="font-semibold">Settings</Label>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="allow-comments">Allow Comments</Label>
                        <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="allow-download">Enable Downloads</Label>
                        <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                 </div>
            </div>
          ) : (
            <div
              className="h-48 bg-muted rounded-md flex items-center justify-center cursor-pointer border-2 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center text-muted-foreground">
                <UploadCloud className="mx-auto h-12 w-12" />
                <p>Click to upload your film</p>
                <p className="text-xs">High-quality video files</p>
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
          <Button onClick={handlePost} className="w-full" disabled={!videoFile || uploadProgress > 0}>
            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Post Film'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
