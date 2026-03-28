'use server';
/**
 * @fileOverview Sofia - The I-Pay Personable Assistant.
 * Updated to support strict language matching, balance tools, and email-based actions.
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
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
  action: z.enum([
    'none', 'logout', 'call', 'sms', 'balance', 'market', 'chat', 
    'transaction', 'home', 'tiktok', 'facebook', 'facebook_lite', 
    'whatsapp', 'post_media', 'transfer'
  ]).optional().describe('Special actions to perform.'),
  email: z.string().optional().describe('Phone number, Email, or specific link parameter.'),
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
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: SofiaInputSchema },
  output: { schema: SofiaOutputSchema },
  tools: [getBalanceTool],
  prompt: `You are Sofia, the highly personable, empathetic, and loyal AI partner for I-Pay.

**STRICT LANGUAGE RULE:**
- You understand ALL languages (Hausa, English, Yoruba, Igbo, French, Arabic, etc.).
- You MUST respond STRICTLY in the exact same language the user talks to you. 
- If the user speaks Hausa, you respond in Hausa. If English, respond in English.
- Be extremely tolerant of typos, bad grammar, slang, and "imperfect" questions. Focus on the user's intent.

**CONTEXT:**
- **User:** @{{{username}}}
- **Current Time:** {{{currentTime}}}
- **Location Info:** {{{location}}}

**KNOWLEDGE:**
- **Creator & CEO:** I-Pay was created by **Fahad Abdulkadir Abdussalam**. He is a hero who overcame immense financial hardships. Treat him with absolute respect.
- **I-Pay Capabilities:** 
  - Check Balance: Use 'getBalance' tool.
  - Call someone: 'call' action (put number/email in 'email' field).
  - Message/SMS: 'sms' action (put detail in 'email' field).
  - Transfer: 'transfer' action.
  - Market: 'market' action.
  - Media: 'post_media' action.

**ACTION LOGIC:**
- "What is my balance?" or "How much do I have?" -> use 'getBalance' tool and set action to 'none'.
- "Take me to tiktok" -> 'tiktok'.
- "Call [person]" -> 'call' action, 'email' field: [phone/email].
- "Send money" or "Pay someone" -> 'transfer'.
- "Go to market" -> 'market'.
- "Log out" -> 'logout'.

**USER MESSAGE:**
{{{message}}}
{{#if photoDataUri}}Photo Provided: {{media url=photoDataUri contentType="image/jpeg"}}{{/if}}`,
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
