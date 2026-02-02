"use client";

import { useState } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateFeaturesAction } from "./actions";

interface AppFeature {
  id: number;
  text: string;
  selected: boolean;
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateFeatures = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Please describe your application idea.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setFeatures([]);

    const result = await generateFeaturesAction(prompt);

    if ("error" in result) {
      toast({
        title: "An error occurred",
        description: result.error,
        variant: "destructive",
      });
    } else if (result.features) {
      setFeatures(
        result.features.map((featureText, index) => ({
          id: index,
          text: featureText,
          selected: true,
        }))
      );
    }
    
    setIsLoading(false);
  };

  const handleFeatureTextChange = (id: number, newText: string) => {
    setFeatures((prevFeatures) =>
      prevFeatures.map((feature) =>
        feature.id === id ? { ...feature, text: newText } : feature
      )
    );
  };

  const handleFeatureSelectionChange = (id: number, isSelected: boolean) => {
    setFeatures((prevFeatures) =>
      prevFeatures.map((feature) =>
        feature.id === id ? { ...feature, selected: isSelected } : feature
      )
    );
  };

  const handleExportJson = () => {
    const selectedFeatures = features
      .filter((f) => f.selected)
      .map((f) => ({ feature: f.text }));

    if (selectedFeatures.length === 0) {
      toast({
        title: "No features selected",
        description: "Please select at least one feature to export.",
        variant: "destructive",
      });
      return;
    }

    const jsonString = JSON.stringify({ features: selectedFeatures }, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app-features.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Sparkles className="text-primary" />
                Describe Your App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., A social media app for pet owners to share photos and tips."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="text-base"
              />
              <Button
                onClick={handleGenerateFeatures}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Generate Features"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold">
              Generated Features
            </h2>
            <Button
              onClick={handleExportJson}
              variant="outline"
              disabled={features.filter((f) => f.selected).length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>

          <div className="space-y-4">
            {isLoading && (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            )}

            {!isLoading && features.length === 0 && (
              <Card className="flex h-64 items-center justify-center border-dashed">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="mx-auto h-12 w-12" />
                  <p className="mt-4">Your generated features will appear here.</p>
                </div>
              </Card>
            )}

            {features.map((feature) => (
              <Card key={feature.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      id={`feature-${feature.id}`}
                      checked={feature.selected}
                      onCheckedChange={(checked) =>
                        handleFeatureSelectionChange(feature.id, !!checked)
                      }
                      className="mt-1"
                    />
                    <div className="grid w-full gap-1.5">
                      <Label
                        htmlFor={`feature-input-${feature.id}`}
                        className="sr-only"
                      >
                        Feature Description
                      </Label>
                      <Input
                        id={`feature-input-${feature.id}`}
                        value={feature.text}
                        onChange={(e) =>
                          handleFeatureTextChange(feature.id, e.target.value)
                        }
                        className="text-base"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
