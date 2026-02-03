import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Tv, Wifi, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function UtilitiesPage() {
  const utilityActions = [
    { label: 'Buy Data', icon: Wifi, href: '/dashboard/utilities/buy-data' },
    { label: 'Buy Airtime', icon: Smartphone, href: '/dashboard/utilities/buy-airtime' },
    { label: 'TV Subscription', icon: Tv, href: '/dashboard/utilities/tv-subscription' },
    { label: 'Recharge Bills', icon: Lightbulb, href: '/dashboard/utilities/recharge-bills' },
  ];

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Utilities</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {utilityActions.map((action) => (
          <Link href={action.href} key={action.label}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-col items-center justify-center text-center gap-2 p-4">
                <action.icon className="h-8 w-8" />
                <CardTitle className="text-sm font-medium">{action.label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
