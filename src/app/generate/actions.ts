'use server';

import { generateAppFeatures, GenerateAppFeaturesOutput } from '@/ai/flows/generate-app-features';

export async function generateFeaturesAction(prompt: string): Promise<GenerateAppFeaturesOutput | { error: string }> {
  if (!prompt) {
    return { error: 'Prompt is required.' };
  }

  try {
    const result = await generateAppFeatures({ prompt });
    return result;
  } catch (error) {
    console.error('Error generating features:', error);
    return { error: 'Failed to generate features. Please try again.' };
  }
}
