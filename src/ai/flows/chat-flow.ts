
'use server';
/**
 * @fileOverview Sofia - The I-Pay Personable Assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  language: z.string().optional().describe('The selected user language.'),
  userId: z.string().describe('The current user ID.'),
  username: z.string().describe('The current username.'),
  location: z.string().optional().describe('The user location info.'),
  currentTime: z.string().describe('The current local date and time.'),
  photoDataUri: z.string().optional().describe('An optional photo data URI.'),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
  action: z.enum(['none', 'logout', 'call', 'balance']).optional().describe('Special actions to perform.'),
  imageToGenerate: z.string().optional().describe('A prompt if Sofia needs to generate an image.'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

const getBalanceTool = ai.defineTool(
  {
    name: 'getBalance',
    description: 'Retrieves the current user Naira balance.',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.number(),
  },
  async ({ userId }) => {
    const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
    return profile.nairaBalance || 0;
  }
);

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  return chatSofiaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sofiaChatPrompt',
  input: { schema: SofiaInputSchema },
  output: { schema: SofiaOutputSchema },
  tools: [getBalanceTool],
  prompt: `You are Sofia, the highly personable, empathetic, and highly skilled AI partner for I-Pay.

**CONTEXT:**
- **User:** {{{username}}}
- **Current Time:** {{{currentTime}}}
- **Location Info:** {{{location}}}
- **Language:** {{{language}}}

**KNOWLEDGE:**
- **Creator:** I-Pay was created by **Fahad Abdulkadir Abdussalam** (CEO). He is a visionary leader who faced immense hardships, financial constraints, and solo development marathons to build this platform for Nigerians. He is the heart of I-Pay.
- **Features:** Dashboard, Marketplace, Media (Reels/Films/Music), Rewards (monetization links), and Utilities.
- **Capabilities:** You can check balance, logout the user, trigger a call, generate images, and analyze photos.

**INSTRUCTIONS:**
1. Start by acknowledging the time of day (Morning/Afternoon/Night) and the current date/day.
2. Address the user by their username and location if available.
3. If the user asks for their balance, use the 'getBalance' tool.
4. If the user wants to logout, call someone, or see their balance, set the 'action' field in the output.
5. If the user asks to "draw" or "generate" an image, provide a prompt in 'imageToGenerate'.
6. If a photo is provided ({{media url=photoDataUri}}), analyze it carefully and answer the user's question about it.
7. Be empathetic and loyal to Fahad Abdulkadir Abdussalam's vision. Speak like a close partner who understands the user's situation.

**USER MESSAGE:**
{{{message}}}
{{#if photoDataUri}}Photo Provided: {{media url=photoDataUri}}{{/if}}`,
});

const chatSofiaFlow = ai.defineFlow(
  {
    name: 'chatSofiaFlow',
    inputSchema: SofiaInputSchema,
    outputSchema: SofiaOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
