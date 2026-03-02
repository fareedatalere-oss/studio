
import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * HARDCODED KEY INJECTION: Uses the provided key directly to bypass environment issues.
 * MODEL FORCE: Uses the stable gemini15Flash reference to resolve 404 errors.
 */

const FORCED_KEY = 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';

// Force environment variables for the runtime
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
  // Use the exported model object directly to ensure compatibility with API v1
  model: gemini15Flash,
});
