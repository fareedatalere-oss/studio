'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_APP_CONFIG, getAppwriteStorageUrl, ID } from '@/lib/appwrite';

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
      const newLogoUrl = upload.url;

      // FORCE: Use setDocument to ensure the record exists even if never created before
      await databases.setDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG, {
        logoUrl: newLogoUrl
      });
      
      toast({ title: 'Logo updated!' });
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
    <div className="container py-8 max-w-2xl">
      <Link href="/manager/profile" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Profile
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Branding Control</CardTitle>
          <CardDescription className="font-bold text-xs">Update the application master logo</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Current Active Logo</p>
            <div className="w-32 h-32 bg-muted rounded-[2rem] flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                {currentLogo ? <Image src={currentLogo} alt="Logo" width={100} height={100} className="object-contain" unoptimized /> : <p className="text-xs font-bold opacity-30">NONE</p>}
            </div>
          </div>

          <div
            className="h-48 bg-muted/30 rounded-[2.5rem] flex items-center justify-center border-4 border-dashed border-muted cursor-pointer transition-all hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <Image src={preview} alt="New logo" width={150} height={150} className="object-contain" />
            ) : (
              <div className="text-center text-muted-foreground space-y-2">
                <UploadCloud className="mx-auto h-10 w-10 opacity-30" />
                <p className="font-black uppercase text-[10px] tracking-widest">Select New Media</p>
                <p className="text-[8px] font-bold">PNG, JPG, SVG accepted</p>
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
          <Button onClick={handleUpload} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={!logoFile || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : 'Publish New Logo'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
