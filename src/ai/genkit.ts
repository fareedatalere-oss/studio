import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURE KEY LOGIC: Sofia looks for GOOGLE_GENAI_API_KEY in Vercel/Environment Variables.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      // Master instruction: Force look for keys in Vercel environment
      apiKey: process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw',
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
