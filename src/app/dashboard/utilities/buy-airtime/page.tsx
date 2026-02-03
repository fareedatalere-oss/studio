import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BuyAirtimePage() {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Buy Airtime</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Airtime purchase form will be here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
