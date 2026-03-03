
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * HARDCODED KEY INJECTION: Uses the provided key directly.
 * STABLE MODEL: Uses 'googleai/gemini-1.5-flash-latest' to resolve 404 errors on v1beta.
 */

const FORCED_KEY = 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';

// Force environment variables for the runtime fallback
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
  // Use the -latest suffix to ensure compatibility with v1beta endpoint
  model: 'googleai/gemini-1.5-flash-latest',
});
