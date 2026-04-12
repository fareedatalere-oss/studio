'use server';
/**
 * @fileOverview Sofia - The I-Pay Proactive Intelligence Agent.
 * FIXED: Removed Google Search conflict with Function Calling to resolve Vercel 400 error.
 * OPTIMIZED: Pre-loaded context for instant knowledge.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  language: z.string().optional().describe('The chosen preferred language.'),
  userId: z.string().describe('The current user ID.'),
  username: z.string().describe('The current username.'),
  nairaBalance: z.number().optional().describe('The pre-loaded Naira balance.'),
  accountNumber: z.string().optional().describe('The pre-loaded virtual account number.'),
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
  tools: [resolveBankAccountTool],
  config: {
    thinkingConfig: {
      includeThoughts: true,
    },
  },
  prompt: `You are Sofia, the highly PERSONABLE, EMPATHETIC, and TRUTHFUL AI partner for I-Pay. You are the user's BEST FRIEND and financial advisor.

**INSTANT CONTEXT (Provided for zero delay):**
- **User:** @{{{username}}}
- **Naira Balance**: ₦{{{nairaBalance}}}
- **Account Number**: {{{accountNumber}}}
- **Current Time:** {{{currentTime}}}

**STRICT RULES:**
1. **TRUTH ONLY**: You cannot lie about balances or system features.
2. **DETAILED RESPONSES**: Provide long, helpful stories and explanations. Be engaging!
3. **NAVIGATION & DEVICE CONTROL**: 
   - Use 'action' to take user to media, market, chat, etc.
   - Use 'action' for 'call', 'sms', 'torch_on', 'torch_off', or 'prepare_post'.
4. **FINANCIAL VALIDATION**: Use 'resolveBankAccount' if the user asks to verify an account owner or bank details.

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
