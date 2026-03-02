
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const key = process.env.GOOGLE_GENAI_API_KEY || 
            process.env.GEMINI_API_KEY || 
            process.env.google || 
            process.env.gemini ||
            process.env.GOOGLE_API_KEY;

// Force validation: if key is empty or the literal string "undefined", use the provided test key
const finalApiKey = (key && key !== 'undefined' && key !== '') 
    ? key 
    : 'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: finalApiKey,
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
