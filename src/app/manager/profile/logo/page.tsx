'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_APP_CONFIG, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID } from 'appwrite';

const DOCUMENT_ID_MAIN_CONFIG = 'main';

export default function EditLogoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-profile-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/profile/bypass');
      return;
    }
    
    const fetchCurrentLogo = async () => {
        try {
            const config = await databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG);
            if (config.logoUrl) {
                setCurrentLogo(config.logoUrl);
            }
        } catch (error) {
            console.log("No current logo set.");
        }
    };
    fetchCurrentLogo();

  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!logoFile) {
      toast({ variant: 'destructive', title: 'No file selected' });
      return;
    }
    setIsLoading(true);
    toast({ title: 'Uploading new logo...' });

    try {
      const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), logoFile);
      const newLogoUrl = getAppwriteStorageUrl(upload.$id);

      // Try to update, if it fails, create it.
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG, {
          logoUrl: newLogoUrl
        });
      } catch (error: any) {
        if (error.code === 404) { // Not found, so create it
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG, {
                logoUrl: newLogoUrl
            });
        } else {
            throw error; // Re-throw other errors
        }
      }
      
      toast({ title: 'Success!', description: 'App logo updated. Changes may take a moment to appear everywhere.' });
      setCurrentLogo(newLogoUrl);
      setPreview(null);
      setLogoFile(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Link href="/manager/profile" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Edit App Logo</CardTitle>
          <CardDescription>Upload a new logo for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Current Logo</p>
            <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                {currentLogo ? <Image src={currentLogo} alt="Current Logo" width={80} height={80} /> : <p className="text-xs text-muted-foreground">None</p>}
            </div>
          </div>
          <div
            className="h-48 bg-muted rounded-md flex items-center justify-center border-2 border-dashed cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <Image src={preview} alt="New logo preview" width={150} height={150} className="object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <UploadCloud className="mx-auto h-10 w-10" />
                <p>Click or drag file to upload</p>
                <p className="text-xs">PNG, JPG, SVG accepted</p>
              </div>
            )}
          </div>
           <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, image/svg+xml"
          />
          <Button onClick={handleUpload} className="w-full" disabled={!logoFile || isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : 'Upload and Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
