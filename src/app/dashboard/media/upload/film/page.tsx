'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, Camera, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl, ID } from '@/lib/appwrite';

const filmCategories = [
    "Hausa films", 
    "Indian hausa version", 
    "American film", 
    "traditional film", 
    "Nigerian film", 
    "hausa season films"
];

export default function UploadFilmPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(0); // 0: Select Category, 1: Upload
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { user: authUser, profile: userProfile } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
    }
  };

  const handlePost = async () => {
    if (!videoFile || !authUser || !userProfile || !selectedCategory) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing information.' });
        return;
    }
    setIsPosting(true);
    toast({ title: 'Uploading film...', description: 'This may take a while.' });
    
    try {
        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), videoFile);
        const mediaUrl = getAppwriteStorageUrl(uploadResult.$id);

        // Safe Metadata Encoding: CAT:Category|Description
        const encodedDescription = `CAT:${selectedCategory}|${description}`;

        const newPost = {
            userId: authUser.$id,
            username: userProfile.username,
            userAvatar: userProfile.avatar,
            type: 'film',
            mediaUrl: mediaUrl,
            description: encodedDescription,
            allowComments: allowComments,
            allowDownload: allowDownload,
            likes: [],
            commentCount: 0,
        };
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
        toast({ title: 'Film Uploaded!', description: 'Your film is now live.' });
        router.push('/dashboard/media');
    } catch (error: any) {
        toast({ title: 'Post Failed', description: error.message, variant: 'destructive' });
        setIsPosting(false);
    }
  };

  if (step === 0) {
      return (
        <div className="container py-8">
            <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm font-black uppercase">
                <ArrowLeft className="h-4 w-4" /> Back to Media
            </Link>
            <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Choose Film Category</CardTitle>
                    <CardDescription>Select the type of film you are uploading</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                    {filmCategories.map((cat) => (
                        <Button 
                            key={cat} 
                            onClick={() => { setSelectedCategory(cat); setStep(1); }}
                            variant="outline" 
                            className="h-16 justify-between text-lg font-bold uppercase tracking-tight group hover:bg-primary hover:text-white"
                        >
                            {cat}
                            <ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100" />
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="container py-8">
      <Button onClick={() => setStep(0)} variant="ghost" className="mb-4 font-black uppercase text-xs">
        <ArrowLeft className="mr-2 h-4 w-4" /> Change Category ({selectedCategory})
      </Button>
      <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Upload {selectedCategory}</CardTitle>
          <CardDescription>Share your movie with the community.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!videoFile ? (
            <div className="space-y-4">
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full h-16 font-bold uppercase">
                    <UploadCloud className="mr-2 h-6 w-6" /> Select Video File
                </Button>
                <p className="text-xs text-muted-foreground text-center">Supported formats: MP4, MOV, AVI</p>
            </div>
          ) : (
            <div className='space-y-6'>
                <div className="bg-muted/30 p-4 rounded-2xl border">
                    <p className="font-bold text-sm truncate">{videoFile.name}</p>
                    <p className="text-[10px] uppercase font-black opacity-50">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    {isPosting && <Progress className="mt-4" />}
                </div>
                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70">Synopsis / Description</Label>
                    <Textarea
                        placeholder="What is this film about?"
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-xl"
                    />
                </div>
                 <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="allow-comments" className="text-sm font-semibold">Allow Comments</Label>
                        <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="allow-download" className="text-sm font-semibold">Enable Downloads</Label>
                        <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                 </div>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />
        </CardContent>
        <CardFooter>
          <Button onClick={handlePost} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg" disabled={!videoFile || isPosting}>
            {isPosting ? <><Loader2 className="animate-spin mr-2 h-5 w-5"/> Uploading...</> : 'Post Film'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}