import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function GetLoanPage() {
    return (
        <div className="container py-8">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Loan Application</CardTitle>
                    <CardDescription>Please read the terms before proceeding.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <p>By proceeding, you agree to our terms of service regarding loans. It is important to be trustworthy and ensure you can pay back any loan you acquire through our partners.</p>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>Repayments must be made on time to avoid penalties.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>Defaulting on a loan will affect your credit score and ability to get future loans.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>All information provided must be accurate and truthful.</span>
                            </li>
                        </ul>
                        <p>Clicking 'Accept and Continue' will take you to our trusted third-party loan provider, Aset Group LLP.</p>
                    </div>
                     <div className="flex gap-4">
                        <Button asChild className="w-full">
                            <Link href="/dashboard/get-loan/apply">Accept and Continue</Link>
                        </Button>
                         <Button asChild variant="outline" className="w-full">
                           <Link href="/dashboard">Cancel</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
