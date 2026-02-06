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
import { useUser } from '@/hooks/use-appwrite';
import { databases } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { uploadToCloudinary } from '@/app/actions/upload';


const DATABASE_ID = 'i-pay-db';
const COLLECTION_ID_POSTS = 'posts';

export default function UploadFilmPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { user: authUser } = useUser();
  // TODO: Get user profile from Appwrite to fetch username/avatar
  const userProfile = { username: authUser?.name || 'Anonymous', avatar: null };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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

  const handlePost = async () => {
    if (!videoFile || !authUser || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing file or user data.' });
        return;
    }
    setIsPosting(true);
    toast({ title: 'Uploading film...', description: 'This may take a while.' });
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(videoFile);
        reader.onload = async () => {
            const fileDataUri = reader.result as string;
            const uploadResult = await uploadToCloudinary(fileDataUri, 'video');

            if (uploadResult.success && uploadResult.url) {
                 const newPost = {
                    userId: authUser.$id,
                    username: userProfile.username,
                    userAvatar: userProfile.avatar,
                    type: 'film',
                    mediaUrl: uploadResult.url,
                    description: description,
                    allowComments: allowComments,
                    allowDownload: allowDownload,
                    likes: [],
                    commentCount: 0,
                };
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
                toast({
                    title: 'Film Uploaded!',
                    description: 'Your film is now live.',
                });
                router.push('/dashboard/media');
            } else {
                throw new Error(uploadResult.message || 'Upload failed');
            }
        }
    } catch (error) {
        console.error("Post creation failed:", error);
        toast({ title: 'Post Failed', description: 'Could not upload your film.', variant: 'destructive' });
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
          <CardTitle>Upload a Film</CardTitle>
          <CardDescription>Share your movie (up to 5 hours).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {videoFile ? (
            <div className='space-y-4'>
                <div className="border p-4 rounded-md">
                    <p className="font-semibold">{videoFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    {isPosting && <Progress value={undefined} className="mt-2" />}
                </div>
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
          <Button onClick={handlePost} className="w-full" disabled={!videoFile || isPosting}>
            {isPosting ? `Uploading...` : 'Post Film'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
