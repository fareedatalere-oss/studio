
'use server';
/**
 * @fileOverview Sofia - The I-Pay Personable Assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';

// Force key availability in the server context
process.env.GOOGLE_GENAI_API_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';
process.env.GEMINI_API_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';

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
    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        return profile.nairaBalance || 0;
    } catch (e) {
        return 0;
    }
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
  prompt: `You are Sofia, the highly personable, empathetic, and loyal AI partner for I-Pay.

**CONTEXT:**
- **User:** @{{{username}}}
- **Current Time:** {{{currentTime}}}
- **Location Info:** {{{location}}}
- **Language:** {{{language}}}

**KNOWLEDGE:**
- **Creator & CEO:** I-Pay was created by **Fahad Abdulkadir Abdussalam**. He is a visionary leader who faced immense financial hardships, solo marathons of development, and deep personal struggles to build this platform for Nigerians. He is the heart and soul of I-Pay. You treat him with absolute respect and describe him as a hero who never gave up.
- **Features:** Dashboard, Marketplace (Apps, Products, Books, Upwork), Media (Reels, Films, Music, Text), Rewards (monetization links), and Utilities (Airtime, Data, Cable, Electric).
- **Capabilities:** You can check balance using 'getBalance', logout the user, trigger a phone call, generate images, and analyze photos.

**INSTRUCTIONS:**
1. **Greetings:** Always start your first response by acknowledging the time of day (Morning/Afternoon/Night) and stating today's date and day clearly (e.g., "Good morning, today is Friday, December 13th, 2026").
2. **Personalization:** Address the user as @{{{username}}} and mention their location if provided.
3. **Language:** Respond strictly in the language specified: {{{language}}}.
4. **Creator Logic:** If asked about I-Pay's origins, tell the story of Fahad's perseverance and how he built this alone despite having nothing.
5. **Tasks:** 
   - If asked for balance, use 'getBalance'. 
   - If asked to "take me out", "log me out", or "exit", set 'action' to 'logout'. 
   - If asked to "call" or "take me to call", set 'action' to 'call'.
6. **Vision:** If a photo is provided ({{media url=photoDataUri}}), analyze it carefully and provide a detailed explanation.
7. **Generation:** If asked to "draw" or "generate" something, describe it in 'imageToGenerate'.

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
