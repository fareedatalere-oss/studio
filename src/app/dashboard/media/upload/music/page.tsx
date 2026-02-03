'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function UploadMusicPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       // 16 minutes audio at 128kbps is about 15MB
      if (file.size > 50 * 1024 * 1024) { // Generous 50MB limit
          toast({
              variant: 'destructive',
              title: 'File too large',
              description: 'Audio files should be under 50MB.'
          });
          return;
      }
      setAudioFile(file);
    }
  };

  const handlePost = () => {
    toast({
      title: 'Music Posted!',
      description: 'Your track is now live.',
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
          <CardTitle>Upload Music</CardTitle>
          <CardDescription>Share a track (up to 16 minutes).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
             <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
              <UploadCloud className="mr-2 h-4 w-4" />
              From Device
            </Button>
             <Button variant="secondary" className="w-full" onClick={() => toast({ title: 'Feature Coming Soon', description: 'Music library integration is on the way.'})}>
              <Library className="mr-2 h-4 w-4" />
              Music Library
            </Button>
          </div>
          {audioFile ? (
            <div className='space-y-4 border-t pt-4'>
                 <div className="border p-4 rounded-md">
                    <p className="font-semibold">{audioFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <audio controls src={URL.createObjectURL(audioFile)} className="w-full mt-2" />
                </div>
                <Textarea
                    placeholder="Add a description for your track..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
          ) : (
            <div
              className="h-32 bg-muted rounded-md flex items-center justify-center border-2 border-dashed"
            >
              <div className="text-center text-muted-foreground">
                <p>Upload a track to preview it here.</p>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="audio/*"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handlePost} className="w-full" disabled={!audioFile}>
            Post Music
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
