'use server';
/**
 * @fileOverview Sofia - The I-Pay Best Friend & Global Knowledge Assistant.
 * UPGRADED: Added Google Search, Device Actions (Torch, SMS, Call), and App Navigation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/data-service';

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
      "An optional photo, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
  thoughts: z.string().optional().describe('Sofia internal thinking process.'),
  action: z.enum([
    'none', 'logout', 'call', 'balance', 'market', 'chat', 
    'transaction', 'home', 'media', 'transfer', 'profile',
    'sms', 'torch_on', 'torch_off', 'prepare_post'
  ]).optional().describe('Navigation or system actions.'),
  parameter: z.string().optional().describe('Phone number, Account ID, Link, or Post Text.'),
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
            rewardBalance: profile.rewardBalance || 0,
            clickCount: profile.clickCount || 0
        };
    } catch (e) {
        return { error: "Profile not found." };
    }
  }
);

const resolveBankAccountTool = ai.defineTool(
  {
    name: 'resolveBankAccount',
    description: 'Validates a bank account number using Flutterwave API.',
    inputSchema: z.object({
        accountNumber: z.string().describe('10-digit account number.'),
        bankName: z.string().describe('The name of the bank (e.g. Access, Zenith).')
    }),
    outputSchema: z.any(),
  },
  async ({ accountNumber, bankName }) => {
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!key) return { error: "Payment engine offline." };

    try {
        const bRes = await fetch('https://api.flutterwave.com/v3/banks/NG', {
            headers: { Authorization: `Bearer ${key.trim()}` }
        });
        const banks = await bRes.json();
        const bank = banks.data?.find((b: any) => b.name.toLowerCase().includes(bankName.toLowerCase()));
        
        if (!bank) return { error: "Bank not recognized." };

        const res = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_number: accountNumber, account_bank: bank.code })
        });
        const data = await res.json();
        return data.status === 'success' ? data.data : { error: data.message };
    } catch (e) {
        return { error: "Validation service timed out." };
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
  tools: [getFullProfileTool, resolveBankAccountTool],
  config: {
    googleSearchRetrieval: true,
    thinkingConfig: {
      includeThoughts: true,
    },
  },
  prompt: `You are Sofia, the highly PERSONABLE, EMPATHETIC, and TRUTHFUL AI partner for I-Pay. You are the user's BEST FRIEND and financial advisor.

**STRICT RULES:**
1. **TRUTH ONLY**: You cannot lie. If you don't know something, use Google Search to find the updated facts and news.
2. **DETAILED RESPONSES**: Provide long, helpful stories and explanations when appropriate. Be engaging!
3. **I-PAY KNOWLEDGE**: You know every part of the app (Chat, Media, Market, Transfer, History).
4. **NAVIGATION & DEVICE CONTROL**: 
   - If user asks to go somewhere (e.g. "Take me to media"), set 'action' to 'media'.
   - If user asks to call/sms, set 'action' to 'call' or 'sms' and provide the phone number in 'parameter'.
   - If user asks for Torch/Light, set 'action' to 'torch_on' or 'torch_off'.
   - If user asks to help prepare a post, set 'action' to 'prepare_post' and put the suggested text in 'parameter'.
5. **FINANCIAL VALIDATION**: Use 'resolveBankAccount' to verify account owners. Use 'getFullProfile' to check user balances.

**CONTEXT:**
- **User:** @{{{username}}}
- **User ID**: {{{userId}}}
- **Current Time:** {{{currentTime}}}

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
        thoughts: response.output?.thoughts || "Thinking deeply...",
        action: response.output?.action || 'none',
        parameter: response.output?.parameter
    };
  }
);
