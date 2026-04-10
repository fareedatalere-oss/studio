import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURITY NOTICE: Listening strictly to environment variables.
 * This configuration uses GOOGLE_GENAI_API_KEY set in Vercel/Hosting settings.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
