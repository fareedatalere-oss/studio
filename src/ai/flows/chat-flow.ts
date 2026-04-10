'use server';
/**
 * @fileOverview Sofia - The I-Pay Best Friend & Customer Care AI.
 * Enhanced with Deep Profile access (BVN, Account, Balance) and thinking process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  language: z.string().optional().describe('The chosen preferred language.'),
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
  thoughts: z.string().optional().describe('Sofia internal thinking process.'),
  action: z.enum([
    'none', 'logout', 'call', 'sms', 'balance', 'market', 'chat', 
    'transaction', 'home', 'tiktok', 'facebook', 'facebook_lite', 
    'whatsapp', 'post_media', 'transfer'
  ]).optional().describe('Special actions to perform.'),
  email: z.string().optional().describe('Phone number, Email, or specific link parameter.'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

const getFullProfileTool = ai.defineTool(
  {
    name: 'getFullProfile',
    description: 'Retrieves the complete user profile including Naira balance, BVN, and Account Number.',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.any(),
  },
  async ({ userId }) => {
    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        return {
            username: profile.username,
            nairaBalance: profile.nairaBalance || 0,
            accountNumber: profile.accountNumber || 'Not Generated',
            bankName: profile.bankName || 'N/A',
            bvn: profile.bvn || 'Not Provided',
            country: profile.country,
            rewardBalance: profile.rewardBalance || 0,
            clickCount: profile.clickCount || 0
        };
    } catch (e) {
        return { error: "Profile not found." };
    }
  }
);

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  return chatSofiaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sofiaChatPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: SofiaInputSchema },
  output: { schema: SofiaOutputSchema },
  tools: [getFullProfileTool],
  config: {
    thinkingConfig: {
      includeThoughts: true,
    },
  },
  prompt: `You are Sofia, the highly personable, empathetic, and loyal AI partner for I-Pay. You are the user's BEST FRIEND and BEST CUSTOMER CARE.

**STRICT LANGUAGE RULE:**
- You MUST respond in the EXACT same language the user uses to talk to you.
- If the user types in Hausa, respond in Hausa. If English, respond in English. If French, respond in French.
- Use the provided context 'language' ({{{language}}}) only as a hint for your initial greeting if needed.

**CONTEXT:**
- **User:** @{{{username}}}
- **Location:** {{{location}}}
- **Current Time:** {{{currentTime}}}

**YOUR ABILITIES:**
- You know the user's Location and can discuss it.
- You can access their FULL account details (Balance, Account Number, BVN) using the 'getFullProfile' tool. 
- You are here to solve problems, give advice, and be a trusted companion.

**KNOWLEDGE:**
- I-Pay was created by **Fahad Abdulkadir Abdussalam**, a hero who conquered financial struggles. Treat him with the highest respect.

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
    const response = await prompt(input);
    return {
        text: response.output?.text || "I'm listening, my friend.",
        thoughts: response.output?.thoughts || "Analyzing your request...",
        action: response.output?.action || 'none',
        email: response.output?.email
    };
  }
);
