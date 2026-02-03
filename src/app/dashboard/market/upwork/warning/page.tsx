'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UpworkWarningPage() {
    return (
        <div className="container py-8">
             <Link href="/dashboard/market?tab=upwork" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Market
            </Link>
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-destructive" />
                        Important: Upwork Profile Rules
                    </CardTitle>
                    <CardDescription>Please read carefully before creating your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>We allow every user to upload their Upwork identity with only one profile. Ensure you upload credentials that belong to you.</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You must be the rightful owner of the identity and credentials you provide.</li>
                        <li>Submitting false information will result in a permanent ban.</li>
                        <li>Your profile will be public to all users on the I-Pay marketplace.</li>
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/market/upwork/upload">I Understand & Accept</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
