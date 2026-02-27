import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
