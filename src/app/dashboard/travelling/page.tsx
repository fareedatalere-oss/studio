'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar as CalendarIcon, Plane, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function TravellingPage() {
    const { toast } = useToast();
    const [step, setStep] = useState(1); // 1: Search, 2: Results, 3: Payment
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSearch = () => {
        setIsLoading(true);
        // Simulate a real search delay
        setTimeout(() => {
            setStep(2);
            setIsLoading(false);
        }, 1500);
    }

    const handleBook = () => {
        setIsLoading(true);
        setTimeout(() => {
            toast({
                title: 'Booking Initialized',
                description: 'We are processing your travel payment through our Paystack gateway.',
            });
            setStep(3);
            setIsLoading(false);
        }, 1000);
    }

  return (
    <div className="container py-8">
       <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Plane className="text-primary" />
                {step === 1 ? 'Find a Flight' : step === 2 ? 'Select Flight' : 'Payment Details'}
            </CardTitle>
            <CardDescription>
                {step === 1 ? 'Search for domestic and international flights.' : 'Choose from available Paystack-partnered flights.'}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {step === 1 && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="from">From</Label>
                        <Input id="from" placeholder="e.g., Lagos (LOS)" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="to">To</Label>
                        <Input id="to" placeholder="e.g., Abuja (ABV)" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleSearch} className="w-full" disabled={isLoading || !from || !to || !date}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Search Flights'}
                    </Button>
                </>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors" onClick={handleBook}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold">Air Peace</span>
                            <span className="text-primary font-bold">₦85,000</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{from} → {to}</p>
                        <p className="text-xs text-muted-foreground">{date ? format(date, "PP") : ''} • 1h 15m</p>
                    </div>
                    <div className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors" onClick={handleBook}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold">United Nigeria</span>
                            <span className="text-primary font-bold">₦78,000</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{from} → {to}</p>
                        <p className="text-xs text-muted-foreground">{date ? format(date, "PP") : ''} • 1h 20m</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setStep(1)}>New Search</Button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 text-center">
                    <div className="p-6 bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Payment Gateway Connected</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Please use our "Multi-Purpose" section to complete this flight payment to the airline's Paystack account.
                        </p>
                    </div>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/multi-purpose">Go to Multi-Purpose Payment</Link>
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}