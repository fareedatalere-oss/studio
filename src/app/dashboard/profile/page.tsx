import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, Megaphone, PenSquare, Settings } from 'lucide-react';

export default function ProfilePage() {
  const user = {
    name: 'johndoe',
    avatar: 'https://picsum.photos/seed/102/200/200',
    followers: 1200,
    following: 340,
    likes: '10.5k',
  };

  const actions = [
    { label: 'Settings', icon: Settings },
    { label: 'Ads', icon: Megaphone },
    { label: 'Post', icon: PenSquare },
    { label: 'Log Out', icon: LogOut },
  ];

  return (
    <div className="container py-8">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="text-center">
          <h1 className="text-2xl font-bold">@{user.name}</h1>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="flex justify-around p-4 text-center">
            <div>
              <p className="font-bold text-lg">{user.followers}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="font-bold text-lg">{user.following}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
            <div>
              <p className="font-bold text-lg">{user.likes}</p>
              <p className="text-sm text-muted-foreground">Likes</p>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-md space-y-2">
          {actions.map((action) => (
            <Button key={action.label} className="w-full justify-start gap-3">
              <action.icon className="h-5 w-5" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
