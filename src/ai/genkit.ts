
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || 
              process.env.GEMINI_API_KEY || 
              process.env.google || 
              process.env.gemini ||
              process.env.GOOGLE_API_KEY ||
              'AIzaSyBXmWSO82Asc9EYo-ETcuovujXgvH_pMMw', // Forced Test Key
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
