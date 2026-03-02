
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * FORCED KEY INJECTION: Uses provided test key as a hardcoded fallback.
 * This version is designed to be extremely robust against missing or misnamed environment variables.
 */

const getApiKey = () => {
    // 1. Check all possible environment variable names used in Vercel settings
    const envKey = process.env.GOOGLE_GENAI_API_KEY || 
                   process.env.GEMINI_API_KEY || 
                   process.env.google || 
                   process.env.gemini ||
                   process.env.GOOGLE_API_KEY;

    // 2. Hardcoded fallback key provided by the user
    const fallbackKey = 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';

    // 3. Validation: if envKey is missing, empty, or "undefined"/"null" string, use fallback
    if (!envKey || envKey === 'undefined' || envKey === 'null' || envKey.trim() === '') {
        return fallbackKey;
    }
    
    return envKey.trim();
};

const apiKey = getApiKey();

// Programmatically set the default environment variable that the Google AI SDK often looks for
if (typeof process !== 'undefined' && process.env) {
    process.env.GOOGLE_GENAI_API_KEY = apiKey;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
