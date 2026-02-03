import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MarketSubscribePage() {
    return (
        <div className="container py-8">
            <Link href="/dashboard/market" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Market
            </Link>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Marketplace Subscription</CardTitle>
                    <CardDescription>Rules and Regulations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <p>Access to the I-Pay marketplace requires a one-time registration fee. Please read the terms before proceeding.</p>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>A one-time, non-refundable fee of <strong>₦25,000</strong> is required.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>This subscription grants you lifetime access to all marketplace features.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>All transactions within the market are subject to standard platform fees.</span>
                            </li>
                        </ul>
                        <p>By clicking 'Accept and Continue', you agree to these terms.</p>
                    </div>
                     <div className="flex gap-4">
                        <Button asChild className="w-full">
                            <Link href="/dashboard/market/subscribe/payment">Accept and Continue</Link>
                        </Button>
                         <Button asChild variant="outline" className="w-full">
                           <Link href="/dashboard/market">Cancel</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
