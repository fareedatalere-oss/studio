import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * UNIVERSAL KEY BRIDGE: Sofia automatically detects keys from Vercel or .env.
 * Supported Keys: GOOGLE_GENAI_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      // Sofia looks for these keys automatically in your environment variables.
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
