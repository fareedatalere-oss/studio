import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURE KEY LOGIC: Sofia looks for GOOGLE_GENAI_API_KEY in Environment Variables.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      // Sofia looks here for your Gemini Key.
      // Set this in your Hosting Provider (Vercel) or .env file.
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw',
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
