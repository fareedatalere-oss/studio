import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURITY NOTICE: Using master key provided by the administrator.
 * Optimized for high-speed Customer Care responses.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyCrVm0U7WabrXv2g-WPqteM2RhEnvwRkSU',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
