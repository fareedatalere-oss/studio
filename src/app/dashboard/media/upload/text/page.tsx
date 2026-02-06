'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases } from '@/lib/appwrite';
import { ID } from 'appwrite';


// TODO: Replace with your actual Database and Collection IDs from Appwrite
const DATABASE_ID = 'YOUR_DATABASE_ID';
const COLLECTION_ID_POSTS = 'YOUR_COLLECTION_ID_POSTS';

const colors = [
  { name: 'Red', value: 'bg-red-700' },
  { name: 'Blue', value: 'bg-blue-700' },
  { name: "Green", value: "bg-green-700" },
  { name: 'Black', value: 'bg-black' },
  { name: 'White', value: 'bg-white', text: 'text-black' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Purple', value: 'bg-purple-700' },
  { name: 'Ash', value: 'bg-gray-500' },
];

export default function UploadTextPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[3]);
  const [allowComments, setAllowComments] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const { user: authUser } = useUser();
  // TODO: Get user profile from Appwrite to fetch username/avatar
  const userProfile = { username: authUser?.name || 'Anonymous', avatar: null };

  const handlePublish = async () => {
    if (!text.trim() || !authUser || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing text or user data.' });
      return;
    }
    setIsPosting(true);
    toast({ title: 'Publishing...' });

    try {
      const newPost = {
        userId: authUser.$id,
        username: userProfile.username,
        userAvatar: userProfile.avatar,
        type: 'text',
        text: text,
        backgroundColor: selectedColor.value,
        description: text, // For text posts, description can be the text itself
        allowComments: allowComments,
        allowDownload: false, // Text posts aren't downloadable
        likes: [],
        commentCount: 0,
      };
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
      toast({
        title: 'Published!',
        description: 'Your text post is now live.',
      });
      router.push('/dashboard/media');
    } catch (error) {
      console.error("Post creation failed:", error);
      toast({ title: 'Publish Failed', description: 'Could not publish your post.', variant: 'destructive' });
      setIsPosting(false);
    }
  };

  if (step === 2) {
    return (
      <div className="container py-8">
        <Button onClick={() => setStep(1)} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
        </Button>
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Preview & Settings</CardTitle>
            <CardDescription>Finalize your post before publishing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={cn("rounded-lg p-8 min-h-[200px] flex items-center justify-center text-center", selectedColor.value, selectedColor.text || 'text-white')}>
              <p className="text-xl font-medium whitespace-pre-wrap">{text}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-comments">Allow Comments</Label>
                <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handlePublish} className="w-full" disabled={isPosting}>
              {isPosting ? 'Publishing...' : 'Publish'}
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
          <CardTitle>Create a Text Post</CardTitle>
          <CardDescription>Write your message and choose a background color.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center mb-2">
              <Palette className="mr-2 h-4 w-4" />
              Background Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={cn('h-8 w-8 rounded-full border-2', color.value, selectedColor.value === color.value ? 'border-ring' : 'border-transparent')}
                >
                  {selectedColor.value === color.value && <Check className={cn('h-6 w-6 mx-auto', color.text || 'text-white')} />}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="What's on your mind?"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={cn('text-lg', selectedColor.value, selectedColor.text || 'text-white', 'placeholder:text-gray-300')}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={() => setStep(2)} className="w-full" disabled={!text.trim()}>
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
