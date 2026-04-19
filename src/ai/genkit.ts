
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Engine configuration.
 * SECURITY: Master authorized API key injected for production stability.
 * FORCE: Injecting into environment to resolve plugin lookup failures.
 */

const MASTER_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';

if (typeof process !== 'undefined') {
  process.env.GOOGLE_GENAI_API_KEY = MASTER_KEY;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: MASTER_KEY,
    }),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});
