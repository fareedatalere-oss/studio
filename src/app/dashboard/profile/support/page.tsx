
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Building, Mail, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const DocumentationContent = () => (
    <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="signup">
            <AccordionTrigger>Sign Up & Sign In</AccordionTrigger>
            <AccordionContent>
                <p className="font-semibold">Privacy & Security:</p>
                <p>Your account security is our top priority. We use industry-standard encryption for your password. We will never share your email address with third parties without your explicit consent. All login attempts are monitored to prevent unauthorized access.</p>
            </AccordionContent>
        </AccordionItem>
        <AccordionItem value="home">
            <AccordionTrigger>Home & Transactions</AccordionTrigger>
            <AccordionContent>
                 <p className="font-semibold">Transaction Fees:</p>
                <p>To maintain our platform and ensure secure transactions, a small fee is applied to certain transactions. These fees can range from ₦20, ₦30, ₦50, ₦100, up to ₦200 and above, depending on the transaction type and amount. The exact fee will always be displayed for your confirmation before you complete any payment.</p>
                 <p className="mt-2 font-semibold">Privacy:</p>
                <p>Your transaction history is private and only visible to you. We do not sell your financial data.</p>
            </AccordionContent>
        </AccordionItem>
         <AccordionItem value="chat">
            <AccordionTrigger>Chat</AccordionTrigger>
            <AccordionContent>
                <p className="font-semibold">Privacy:</p>
                <p>Your conversations are private. We do not read your messages. Please be aware of the information you share with other users. Do not share sensitive personal or financial information in chats.</p>
            </AccordionContent>
        </AccordionItem>
         <AccordionItem value="followers">
            <AccordionTrigger>Followers & Rewards</AccordionTrigger>
            <AccordionContent>
                <p className="font-semibold">Follower Rewards Program:</p>
                <p>We value our content creators. For every 10,000 followers you gain, you are eligible for a monthly reward of ₦50,000. This is to encourage quality content and community growth. Payments are processed at the end of each calendar month, provided you maintain the 10,000 follower count.</p>
            </AccordionContent>
        </AccordionItem>
        <AccordionItem value="market">
            <AccordionTrigger>Marketplace</AccordionTrigger>
            <AccordionContent>
                 <p className="font-semibold">Privacy & Charges:</p>
                <p>When you sell an item, your username is visible to buyers. Your contact information is only shared if you explicitly choose "Phone Call" as a contact method for a product. A service charge is applied to all sales to cover platform maintenance and payment processing. This fee will be clearly detailed before you list an item.</p>
            </AccordionContent>
        </AccordionItem>
    </Accordion>
);

const ContactContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="font-bold text-lg mb-2">Abuja Office</h3>
            <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Address:</strong> Area Kpebi Serki Asokoro Extension FCT ABUJA, Kpebi Okada Junction line street Phone charging shop.</p>
                <p><strong>Contact Person:</strong> Abubakar Abdullahi</p>
                <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> 08169503595
                </p>
            </div>
        </div>
         <div>
            <h3 className="font-bold text-lg mb-2">Kaduna Office</h3>
            <div className="text-sm text-muted-foreground space-y-1">
                 <p><strong>Address:</strong> Lere Local Government Area, 12 Dankaka way, or Kwarfada chief palace.</p>
                 <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> 07086556098
                 </p>
            </div>
        </div>
        <div>
            <h3 className="font-bold text-lg mb-2">Alternative Support</h3>
             <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <a href="https://wa.me/2348169503595" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-5 w-5 text-green-500" /> WhatsApp (1)
                    </a>
                </Button>
                 <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <a href="https://wa.me/2348162810155" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-5 w-5 text-green-500" /> WhatsApp (2)
                    </a>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <a href="mailto:Ipayapp166@gmail.com">
                        <Mail className="h-5 w-5"/> Email Support (1)
                    </a>
                </Button>
                 <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <a href="mailto:Ipaycustometcare973@gmail.com">
                        <Mail className="h-5 w-5"/> Email Support (2)
                    </a>
                </Button>
             </div>
        </div>
    </div>
);


export default function SupportPage() {
    const [view, setView] = useState<'docs' | 'contact'>('docs');

  return (
    <div className="container py-8">
      <Link href="/dashboard/profile" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Support Center</CardTitle>
          <CardDescription>Find answers in our documentation or contact us directly.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-2 mb-6">
                <Button variant={view === 'docs' ? 'default' : 'outline'} onClick={() => setView('docs')} className="gap-2">
                    <BookOpen />
                    I-Pay Documentation
                </Button>
                <Button variant={view === 'contact' ? 'default' : 'outline'} onClick={() => setView('contact')} className="gap-2">
                    <Building />
                    Contacts & Addresses
                </Button>
            </div>
            
            {view === 'docs' ? <DocumentationContent /> : <ContactContent />}

        </CardContent>
      </Card>
    </div>
  );
}
