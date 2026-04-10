import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * MASTER KEY: Using provided AIzaSyBz_2n8bkcY9fCYf2_8FKLHd_Ue-sVs6rs
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyBz_2n8bkcY9fCYf2_8FKLHd_Ue-sVs6rs',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
