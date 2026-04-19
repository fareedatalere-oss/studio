import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURITY: Master authorized API key injected for production stability.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8',
    }),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});
