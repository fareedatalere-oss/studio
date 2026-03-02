import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * FORCED KEY INJECTION: Prioritizes the provided key for immediate connection.
 */

const FORCED_KEY = 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';

// Ensure the environment variables are set for the SDK
if (typeof process !== 'undefined' && process.env) {
    process.env.GOOGLE_GENAI_API_KEY = FORCED_KEY;
    process.env.GEMINI_API_KEY = FORCED_KEY;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: FORCED_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
