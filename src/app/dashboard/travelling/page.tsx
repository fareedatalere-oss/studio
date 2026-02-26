'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar as CalendarIcon, Plane } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function TravellingPage() {
    const { toast } = useToast();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSearch = () => {
        setIsLoading(true);
        // This logic is now updated to reference Paystack infrastructure for future payment integration.
        setTimeout(() => {
            toast({
                variant: 'destructive',
                title: 'Travel Service Unavailable',
                description: 'We are currently integrating Paystack Payouts for flight bookings. Direct flight search via Paystack API is not supported; a travel provider integration is pending.',
                duration: 9000,
            });
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
                <Plane />
                Find a Flight
            </CardTitle>
            <CardDescription>Search for domestic and international flights.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                {isLoading ? 'Searching...' : 'Search Flights'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
