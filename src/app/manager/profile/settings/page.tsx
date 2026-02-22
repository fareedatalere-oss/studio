'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { databases, DATABASE_ID, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { ID } from 'appwrite';

const DOCUMENT_ID_MAIN_CONFIG = 'main';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  // State for forms
  const [credentials, setCredentials] = useState({ oldEmail: '', oldPassword: '', newEmail: '', newPassword: '' });
  const [supportInfo, setSupportInfo] = useState({
    abujaAddress: '', abujaContactPerson: '', abujaPhone: '',
    kadunaAddress: '', kadunaPhone: '',
    whatsapp1: '', whatsapp2: '',
    email1: '', email2: ''
  });

  useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-settings-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/profile/settings/bypass');
      return;
    }
    
    async function fetchSupportInfo() {
      setIsFetching(true);
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG);
        setSupportInfo({
          abujaAddress: doc.abujaAddress || '', abujaContactPerson: doc.abujaContactPerson || '', abujaPhone: doc.abujaPhone || '',
          kadunaAddress: doc.kadunaAddress || '', kadunaPhone: doc.kadunaPhone || '',
          whatsapp1: doc.whatsapp1 || '', whatsapp2: doc.whatsapp2 || '',
          email1: doc.email1 || '', email2: doc.email2 || ''
        });
      } catch (error) {
        console.log("No existing support info found. User can create it.");
      } finally {
        setIsFetching(false);
      }
    }
    fetchSupportInfo();

  }, [router]);

  const handleUpdateCredentials = () => {
    // This is a placeholder, as client-side cannot securely change admin credentials.
    toast({
      title: 'Action Not Implemented',
      description: 'Changing master admin credentials should be done in a secure server environment, not from the client app.',
      variant: 'destructive',
    });
  };

  const handleUpdateSupportInfo = async () => {
    setIsLoading(true);
    try {
        // Use updateDocument, but if it fails with "not found", use createDocument.
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG, supportInfo);
        toast({ title: 'Success', description: 'Support information has been updated.' });
    } catch (error: any) {
        if (error.code === 404) { // Document not found
            try {
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG, supportInfo);
                toast({ title: 'Success', description: 'Support information has been created.' });
            } catch (createError: any) {
                toast({ title: 'Error', description: `Failed to create support info: ${createError.message}`, variant: 'destructive' });
            }
        } else {
             toast({ title: 'Error', description: `Failed to update support info: ${error.message}`, variant: 'destructive' });
        }
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>Manage core application settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="credentials">
              <AccordionTrigger>Change Admin Credentials</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-destructive">This is a placeholder UI. This functionality is not implemented.</p>
                <div className="space-y-2">
                  <Label>Old Email</Label><Input type="email" />
                </div>
                 <div className="space-y-2">
                  <Label>New Email</Label><Input type="email" />
                </div>
                 <div className="space-y-2">
                  <Label>Old Password</Label><Input type="password" />
                </div>
                 <div className="space-y-2">
                  <Label>New Password</Label><Input type="password" />
                </div>
                <Button onClick={handleUpdateCredentials} disabled>Update Credentials</Button>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger>Update Support Information</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {isFetching ? <Loader2 className="animate-spin" /> : (
                  <>
                    <h4 className="font-semibold">Abuja Office</h4>
                    <div className="space-y-2"><Label>Address</Label><Input value={supportInfo.abujaAddress} onChange={e => setSupportInfo({...supportInfo, abujaAddress: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Contact Person</Label><Input value={supportInfo.abujaContactPerson} onChange={e => setSupportInfo({...supportInfo, abujaContactPerson: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input value={supportInfo.abujaPhone} onChange={e => setSupportInfo({...supportInfo, abujaPhone: e.target.value})} /></div>
                    <h4 className="font-semibold pt-4">Kaduna Office</h4>
                    <div className="space-y-2"><Label>Address</Label><Input value={supportInfo.kadunaAddress} onChange={e => setSupportInfo({...supportInfo, kadunaAddress: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input value={supportInfo.kadunaPhone} onChange={e => setSupportInfo({...supportInfo, kadunaPhone: e.target.value})} /></div>
                     <h4 className="font-semibold pt-4">Alternative Support</h4>
                    <div className="space-y-2"><Label>WhatsApp 1 (no +)</Label><Input value={supportInfo.whatsapp1} onChange={e => setSupportInfo({...supportInfo, whatsapp1: e.target.value})} /></div>
                     <div className="space-y-2"><Label>WhatsApp 2 (no +)</Label><Input value={supportInfo.whatsapp2} onChange={e => setSupportInfo({...supportInfo, whatsapp2: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Email 1</Label><Input type="email" value={supportInfo.email1} onChange={e => setSupportInfo({...supportInfo, email1: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Email 2</Label><Input type="email" value={supportInfo.email2} onChange={e => setSupportInfo({...supportInfo, email2: e.target.value})} /></div>
                    <Button onClick={handleUpdateSupportInfo} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Support Info'}</Button>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
