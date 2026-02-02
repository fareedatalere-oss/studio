import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bot,
  History,
  Landmark,
  Newspaper,
  Plane,
  School,
  Send,
  Wrench,
} from 'lucide-react';

export default function DashboardPage() {
  const account = {
    number: '1234567890',
    nairaBalance: '50,000.00',
    rewardBalance: '2,500.00',
    clickCount: 128,
  };

  const actions = [
    { label: 'Send', icon: Send },
    { label: 'Utilities', icon: Wrench },
    { label: 'History', icon: History, href: '#' },
    { label: 'Get Loans', icon: Landmark },
    { label: 'School Payment', icon: School },
    { label: 'Traveling', icon: Plane },
    { label: 'AI', icon: Bot },
    { label: 'News', icon: Newspaper },
  ];

  return (
    <div className="container py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              <p className="font-mono text-lg font-semibold">{account.number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Naira Balance</p>
              <p className="text-2xl font-bold">₦{account.nairaBalance}</p>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-sm text-muted-foreground">Reward Balance</p>
                    <p className="font-semibold">₦{account.rewardBalance}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Click Count</p>
                    <p className="font-semibold">{account.clickCount}</p>
                </div>
                <Button>Get Click Count</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4 text-center">
          {actions.map((action) => (
            <div key={action.label}>
              <Button
                variant="default"
                size="icon"
                className="h-16 w-16 rounded-full mx-auto flex items-center justify-center flex-col gap-1"
              >
                <action.icon className="h-6 w-6" />
              </Button>
              <span className="mt-2 block text-xs font-medium">{action.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
