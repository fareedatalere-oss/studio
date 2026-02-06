'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, Music, Settings, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-appwrite';
import { databases } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { uploadToCloudinary } from '@/app/actions/upload';

// TODO: Replace with your actual Database and Collection IDs from Appwrite
const DATABASE_ID = 'YOUR_DATABASE_ID';
const COLLECTION_ID_POSTS = 'YOUR_COLLECTION_ID_POSTS';

export default function UploadMusicPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const { user: authUser } = useUser();
  // TODO: Get user profile from Appwrite to fetch username/avatar
  const userProfile = { username: authUser?.name || 'Anonymous', avatar: null };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
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

  const handlePost = async () => {
    if (!audioFile || !authUser || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing file or user data.' });
        return;
    }
    setIsPosting(true);
    toast({ title: 'Uploading track...' });
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(audioFile);
        reader.onload = async () => {
            const fileDataUri = reader.result as string;
            const uploadResult = await uploadToCloudinary(fileDataUri, 'video'); // Cloudinary treats audio as video type for storage

            if (uploadResult.success && uploadResult.url) {
                const newPost = {
                    userId: authUser.$id,
                    username: userProfile.username,
                    userAvatar: userProfile.avatar,
                    type: 'music',
                    mediaUrl: uploadResult.url,
                    description: description,
                    allowComments: allowComments,
                    allowDownload: allowDownload,
                    likes: [],
                    commentCount: 0,
                };
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
                toast({ title: 'Music Posted!', description: 'Your track is now live.' });
                router.push('/dashboard/media');
            } else {
                throw new Error(uploadResult.message || 'Upload failed');
            }
        };
    } catch (error) {
        console.error("Post creation failed:", error);
        toast({ title: 'Post Failed', description: 'Could not upload your music.', variant: 'destructive' });
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
                    <div className='flex items-center gap-3'>
                        <Music className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">{audioFile.name}</p>
                            <p className="text-sm text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <audio controls src={URL.createObjectURL(audioFile)} className="w-full mt-2" />
                </div>
                <Textarea
                    placeholder="Add a description for your track..."
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
                        <Label htmlFor="allow-download">Enable Downloads</Label>
                        <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                 </div>
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
          <Button onClick={handlePost} className="w-full" disabled={!audioFile || isPosting}>
             {isPosting ? 'Posting...' : 'Post Music'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
