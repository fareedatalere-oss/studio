import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURITY NOTICE: Using environment variables to prevent API key leaks.
 * Please set GOOGLE_GENAI_API_KEY in your .env or provider settings.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      // Checks multiple standard environment variable names for compatibility
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSy_REPLACE_WITH_NEW_KEY_FROM_AI_STUDIO',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
