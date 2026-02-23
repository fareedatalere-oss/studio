'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ManagerMediaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-media-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/media/bypass');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Media Management</CardTitle>
          <CardDescription>Oversee all media posts on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tools for managing media posts (Text, Image, Reels, Film, Music) would be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
