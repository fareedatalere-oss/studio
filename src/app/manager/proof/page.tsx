'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Power, Globe, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';

const PROOF_DOC_ID = 'proof';

export default function ProofControlPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { proof: existingProof, recheckUser } = useUser();

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [toggles, setToggles] = useState<Record<string, boolean>>({
        main_switch: true,
        tab_dashboard: true,
        tab_chat: true,
        tab_media: true,
        tab_market: true,
        tab_profile: true,
        feat_send: true,
        feat_deposit: true,
        feat_refresh: true,
        feat_buy_airtime: true,
        feat_buy_data: true,
        feat_history: true,
        feat_get_reward: true,
        feat_cable: true,
        feat_electric: true,
        feat_multipurpose: true,
        feat_traveling: true,
        feat_ai: true,
        feat_refund: true,
        feat_news: true,
    });

    useEffect(() => {
        if (existingProof) {
            setToggles(existingProof);
        }
        setIsLoading(false);
    }, [existingProof]);

    const handleToggle = (key: string) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, PROOF_DOC_ID, toggles);
            } catch (e: any) {
                if (e.code === 404) {
                    await databases.createDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, PROOF_DOC_ID, toggles);
                } else {
                    throw e;
                }
            }
            toast({ title: "Controls Updated", description: "Changes are now live across the platform." });
            await recheckUser();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const FeatureToggle = ({ id, label }: { id: string, label: string }) => (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
            <Label htmlFor={id} className="font-semibold">{label}</Label>
            <div className="flex items-center gap-3">
                <span className={toggles[id] ? "text-[10px] font-black text-green-500 uppercase" : "text-[10px] font-black text-destructive uppercase"}>
                    {toggles[id] ? "Live" : "Off"}
                </span>
                <Switch id={id} checked={toggles[id]} onCheckedChange={() => handleToggle(id)} />
            </div>
        </div>
    );

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <Button asChild variant="ghost">
                    <Link href="/manager/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="shadow-lg">
                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>

            <Card className="border-t-4 border-t-destructive shadow-2xl mb-8">
                <CardHeader className="bg-destructive/5">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <Power className="h-6 w-6" /> I-Pay Online (Master Switch)
                    </CardTitle>
                    <CardDescription className="text-destructive/80">Turning this OFF shuts down the entire app for all users.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-6 bg-destructive/10 rounded-xl border border-destructive/20">
                        <div className="space-y-1">
                            <p className="text-xl font-bold">Platform Visibility</p>
                            <p className="text-sm text-muted-foreground">{toggles.main_switch ? "App is visible and accessible." : "App is hidden from everyone except Admins."}</p>
                        </div>
                        <Switch 
                            checked={toggles.main_switch} 
                            onCheckedChange={() => handleToggle('main_switch')}
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" /> Navigation Tabs
                    </h3>
                    <div className="grid gap-2">
                        <FeatureToggle id="tab_dashboard" label="Home Dashboard" />
                        <FeatureToggle id="tab_chat" label="Chat System" />
                        <FeatureToggle id="tab_media" label="Media / Social" />
                        <FeatureToggle id="tab_market" label="Marketplace" />
                        <FeatureToggle id="tab_profile" label="User Profile" />
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                        <Settings className="h-5 w-5" /> Feature Toggles
                    </h3>
                    <div className="grid gap-2 h-[500px] overflow-y-auto pr-2">
                        <FeatureToggle id="feat_send" label="Send / Transfer" />
                        <FeatureToggle id="feat_deposit" label="Deposit / Funding" />
                        <FeatureToggle id="feat_refresh" label="Balance Refresh" />
                        <FeatureToggle id="feat_buy_airtime" label="Airtime Purchase" />
                        <FeatureToggle id="feat_buy_data" label="Data Purchase" />
                        <FeatureToggle id="feat_history" label="History Table" />
                        <FeatureToggle id="feat_get_reward" label="Reward Center" />
                        <FeatureToggle id="feat_cable" label="Cable / TV" />
                        <FeatureToggle id="feat_electric" label="Electric Bill" />
                        <FeatureToggle id="feat_multipurpose" label="Multi-Purpose" />
                        <FeatureToggle id="feat_traveling" label="Travel Booking" />
                        <FeatureToggle id="feat_ai" label="Sofia AI" />
                        <FeatureToggle id="feat_refund" label="Refund / Card" />
                        <FeatureToggle id="feat_news" label="News Hub" />
                    </div>
                </section>
            </div>
        </div>
    );
}
