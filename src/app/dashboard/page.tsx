import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  // Mock user data
  const user = {
    username: 'johndoe',
    country: 'United States',
  };

  return (
    <div className="container py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome back, {user.username}!</h1>

        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Username:</strong> {user.username}
            </p>
            <p>
              <strong>Country:</strong> {user.country}
            </p>
          </CardContent>
        </Card>

        {/* Other dashboard content can go here */}
      </div>
    </div>
  );
}
