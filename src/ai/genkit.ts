import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * FORCED KEY INJECTION: Prioritizes the provided key for immediate connection.
 */

const getApiKey = () => {
    // 1. Hardcoded key provided by Master Fahad
    const forcedKey = 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';

    // 2. Check local environment variables
    const envKey = process.env.GOOGLE_GENAI_API_KEY || 
                   process.env.GEMINI_API_KEY || 
                   process.env.google || 
                   process.env.gemini ||
                   process.env.GOOGLE_API_KEY;

    // 3. Force use of the specific key provided if env is not reliable
    if (!envKey || envKey === 'undefined' || envKey === 'null' || envKey.trim() === '') {
        return forcedKey;
    }
    
    return envKey.trim();
};

const apiKey = getApiKey();

// Programmatically set the default environment variable for global SDK access
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
