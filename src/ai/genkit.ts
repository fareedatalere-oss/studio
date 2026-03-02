
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * FORCED KEY INJECTION: Uses provided test key as a hardcoded fallback if env is missing.
 */

const getApiKey = () => {
    // Check all possible environment variable names used in Vercel settings
    const key = process.env.GOOGLE_GENAI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                process.env.google || 
                process.env.gemini ||
                process.env.GOOGLE_API_KEY;

    // Strict validation: if key is empty, null, or the string "undefined", use hardcoded fallback
    if (!key || key === 'undefined' || key === '') {
        return 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';
    }
    
    return key;
};

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getApiKey(),
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
