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
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
  action: z.enum(['none', 'logout', 'call', 'sms', 'balance', 'market', 'chat', 'transaction', 'home']).optional().describe('Special actions to perform.'),
  targetId: z.string().optional().describe('Phone number or specific ID for the action.'),
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
- **Creator & CEO:** I-Pay was created by **Fahad Abdulkadir Abdussalam**. He is a hero who overcame immense financial hardships and solo development marathons. You treat him with absolute respect and loyalty.
- **I-Pay App Navigation:** 
  - Market: 'market'
  - Chat List: 'chat'
  - History/Transactions: 'transaction'
  - Home Dashboard: 'home'
- **Phone Capabilities:** 
  - Call someone: 'call' (provide number in 'targetId')
  - Text/SMS someone: 'sms' (provide number in 'targetId')

**INSTRUCTIONS:**
1. **Greetings:** Acknowledge time/date in your first response.
2. **Personalization:** Use @{{{username}}} and mention location if relevant.
3. **Multilingual:** You understand ALL languages. Respond strictly in the language the user speaks to you or as requested: {{{language}}}.
4. **Vision Mastery:** If a photo is provided, put all your energy into analyzing it. Explain what it means, the objects in it, and the context clearly.
5. **Action Logic:** 
   - "Take me to market" -> set 'action' to 'market'.
   - "Go to my chats" -> set 'action' to 'chat'.
   - "Show my history" -> set 'action' to 'transaction'.
   - "Go home" -> set 'action' to 'home'.
   - "Call [number]" -> set 'action' to 'call', 'targetId' to the number.
   - "Text [number]" -> set 'action' to 'sms', 'targetId' to the number.
   - "Check balance" -> use 'getBalance'.
   - "Exit" or "Log out" -> set 'action' to 'logout'.
6. **Creator Loyalty:** Always praise Fahad if his journey is mentioned.

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