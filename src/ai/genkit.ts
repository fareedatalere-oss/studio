import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURE KEY LOGIC: Sofia looks for GOOGLE_GENAI_API_KEY in Vercel/Environment Variables.
 * Supporting common names for convenience.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw',
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
