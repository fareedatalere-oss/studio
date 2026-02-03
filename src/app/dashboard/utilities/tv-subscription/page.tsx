import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TvSubscriptionPage() {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>TV Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">TV subscription form will be here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
