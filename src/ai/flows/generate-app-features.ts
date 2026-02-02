// src/ai/flows/generate-app-features.ts
'use server';

/**
 * @fileOverview Generates application features based on a user-provided prompt.
 *
 * - generateAppFeatures - A function that generates app features.
 * - GenerateAppFeaturesInput - The input type for the generateAppFeatures function.
 * - GenerateAppFeaturesOutput - The return type for the generateAppFeatures function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAppFeaturesInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired application.'),
});
export type GenerateAppFeaturesInput = z.infer<typeof GenerateAppFeaturesInputSchema>;

const GenerateAppFeaturesOutputSchema = z.object({
  features: z
    .array(z.string())
    .describe('A list of potential application features based on the user prompt.'),
});
export type GenerateAppFeaturesOutput = z.infer<typeof GenerateAppFeaturesOutputSchema>;

const filterFeaturesTool = ai.defineTool({
  name: 'filterFeatures',
  description: 'Filters a list of features to only include features that are suitable for an MVP and Next.js architecture.',
  inputSchema: z.object({
    features: z.array(z.string()).describe('A list of features to filter.'),
  }),
  outputSchema: z.array(z.string()).describe('The filtered list of features.'),
},
async (input) => {
  // TODO: Implement a more sophisticated filtering mechanism here based on architectural constraints.
  // For now, just return the original list.
  return input.features.slice(0, 5); // limit to 5 features
});

export async function generateAppFeatures(input: GenerateAppFeaturesInput): Promise<GenerateAppFeaturesOutput> {
  return generateAppFeaturesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAppFeaturesPrompt',
  input: {schema: GenerateAppFeaturesInputSchema},
  output: {schema: GenerateAppFeaturesOutputSchema},
  tools: [filterFeaturesTool],
  system: `You are an AI assistant that helps generate a list of potential features for a new application based on a user-provided prompt.  The features should be concise and easily understood by non-technical users. After generating the list of features, filter them using the filterFeatures tool to return only features suitable for an MVP built with Next.js.`,
  prompt: `Based on the following application description, generate a list of potential features:

{{prompt}}`,
});

const generateAppFeaturesFlow = ai.defineFlow(
  {
    name: 'generateAppFeaturesFlow',
    inputSchema: GenerateAppFeaturesInputSchema,
    outputSchema: GenerateAppFeaturesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
