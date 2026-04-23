
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Sofia AI Configuration.
 * STATUS: REACTIVATED.
 * POWER: Google AI Plugin enabled for Real-time Search Grounding.
 */

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
