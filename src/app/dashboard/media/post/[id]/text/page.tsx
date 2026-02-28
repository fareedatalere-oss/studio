'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Type, Heart, MessageCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS } from '@/lib/appwrite';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function FullTextPostPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const postId = params.id as string;

    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;
        setLoading(true);
        databases.getDocument(DATABASE_ID, COLLECTION_ID_POSTS, postId)
            .then(setPost)
            .catch(() => {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the post content.' });
                router.push('/dashboard/media');
            })
            .finally(() => setLoading(false));
    }, [postId, router, toast]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="font-black uppercase text-xs tracking-widest animate-pulse">Opening post...</p>
            </div>
        );
    }

    if (!post) return null;

    return (
        <div className="min-h-screen bg-background p-4 pt-12 pb-20">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="fixed top-12 left-4 h-12 w-12 rounded-full bg-muted border shadow-sm z-50">
                <ArrowLeft className="h-6 w-6" />
            </Button>

            <Card className="max-w-2xl mx-auto rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
                <CardHeader className="bg-muted/30 pb-8">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-4 ring-background shadow-lg">
                            <AvatarImage src={post.userAvatar} />
                            <AvatarFallback className="font-black bg-primary text-white">{post.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="font-black text-xl">@{post.username}</CardTitle>
                            <CardDescription className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-tighter">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(post.$createdAt), 'PPPP')}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className={cn("p-8 min-h-[40vh] flex items-center justify-center text-center", post.backgroundColor)}>
                    <p className={cn("text-2xl font-black leading-snug whitespace-pre-wrap drop-shadow-md", post.backgroundColor === 'bg-white' ? 'text-black' : 'text-white')}>
                        {post.text}
                    </p>
                </CardContent>
                <CardFooter className="p-8 bg-muted/10 flex items-center justify-around border-t">
                    <div className="flex flex-col items-center gap-1">
                        <div className="p-4 bg-background rounded-2xl shadow-sm">
                            <Heart className="h-6 w-6 text-red-500" />
                        </div>
                        <span className="text-xs font-black uppercase">{post.likes?.length || 0} Likes</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="p-4 bg-background rounded-2xl shadow-sm">
                            <MessageCircle className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-xs font-black uppercase">{post.commentCount || 0} Comments</span>
                    </div>
                </CardFooter>
            </Card>
            
            <div className="max-w-md mx-auto mt-10 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">I-Pay Online Business & Transactions</p>
            </div>
        </div>
    );
}
