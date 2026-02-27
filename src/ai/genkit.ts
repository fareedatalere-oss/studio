
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Force the API key into the environment for the runtime
process.env.GOOGLE_GENAI_API_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
