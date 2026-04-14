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
import { databases, DATABASE_ID, COLLECTION_ID_APP_CONFIG, ID } from '@/lib/appwrite';

const DOCUMENT_ID_MAIN_CONFIG = 'main';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
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
        console.log("No config found.");
      } finally {
        setIsFetching(false);
      }
    }
    fetchSupportInfo();

  }, [router]);

  const handleUpdateSupportInfo = async () => {
    setIsLoading(true);
    try {
        // FORCE: Use setDocument to handle missing main config correctly
        await databases.setDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, DOCUMENT_ID_MAIN_CONFIG, supportInfo);
        toast({ title: 'Success', description: 'Updated successfully.' });
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Admin Control</CardTitle>
          <CardDescription className="font-bold text-xs">Manage system metadata and support routes</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="support" className="border-none">
              <AccordionTrigger className="font-black uppercase text-[10px] tracking-widest hover:no-underline py-6">Edit Support Directory</AccordionTrigger>
              <AccordionContent className="space-y-6 pt-2 pb-10">
                {isFetching ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/30 rounded-2xl space-y-4">
                        <h4 className="font-black uppercase text-[9px] text-primary">Abuja Hub</h4>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">Address</Label><Input value={supportInfo.abujaAddress} onChange={e => setSupportInfo({...supportInfo, abujaAddress: e.target.value})} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">Contact Person</Label><Input value={supportInfo.abujaContactPerson} onChange={e => setSupportInfo({...supportInfo, abujaContactPerson: e.target.value})} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">Phone</Label><Input value={supportInfo.abujaPhone} onChange={e => setSupportInfo({...supportInfo, abujaPhone: e.target.value})} className="h-10 rounded-xl" /></div>
                    </div>
                    
                    <div className="p-4 bg-muted/30 rounded-2xl space-y-4">
                        <h4 className="font-black uppercase text-[9px] text-primary">Kaduna Hub</h4>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">Address</Label><Input value={supportInfo.kadunaAddress} onChange={e => setSupportInfo({...supportInfo, kadunaAddress: e.target.value})} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">Phone</Label><Input value={supportInfo.kadunaPhone} onChange={e => setSupportInfo({...supportInfo, kadunaPhone: e.target.value})} className="h-10 rounded-xl" /></div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl space-y-4">
                        <h4 className="font-black uppercase text-[9px] text-primary">Digital Channels</h4>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">WhatsApp 1 (234...)</Label><Input value={supportInfo.whatsapp1} onChange={e => setSupportInfo({...supportInfo, whatsapp1: e.target.value})} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-[8px] font-bold uppercase opacity-50">Email Primary</Label><Input type="email" value={supportInfo.email1} onChange={e => setSupportInfo({...supportInfo, email1: e.target.value})} className="h-10 rounded-xl" /></div>
                    </div>
                    
                    <Button onClick={handleUpdateSupportInfo} disabled={isLoading} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Save System Records'}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
