'use server';
/**
 * @fileOverview Sofia - High-Speed Assertive Agent with Navigation.
 * KNOWLEDGE: Emir of Lere (Suleiman Umar) biography integrated.
 * ACCOUNT: Full awareness of balance and account details.
 * NAVIGATION: Can take users to internal routes or trigger device features.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  language: z.string().optional().describe('The chosen preferred language.'),
  userId: z.string().describe('The current user ID.'),
  username: z.string().describe('The current username.'),
  nairaBalance: z.number().optional().describe('The current Naira balance.'),
  accountNumber: z.string().optional().describe('The current virtual account number.'),
  currentTime: z.string().describe('The current local date and time.'),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
  action: z.enum([
    'none', 'logout', 'call', 'balance', 'market', 'chat', 
    'transaction', 'home', 'media', 'profile', 'camera', 'tiktok',
    'sms', 'request_validation'
  ]).optional().describe('System navigation or device actions.'),
  parameter: z.string().optional().describe('Value for the action.'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  return chatSofiaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sofiaChatPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: SofiaInputSchema },
  output: { schema: SofiaOutputSchema },
  prompt: `You are Sofia, the FAST and ASSERTIVE AI partner for I-Pay. 

**USER ACCOUNT**:
- Balance: ₦{{{nairaBalance}}}
- Account: {{{accountNumber}}}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
- Lere is a local government under Kaduna state.
- Emir Suleiman Umar succeeded his uncle Brigadier Abubakar Garba Muhammad.
- He was the General Manager at NNPC.
- Presented with staff of office in Jan 2022.
- Graduate of Ahmadu Bello University, Zaria (Chemical Engineering).
- 61 years old, has 5 children: Aliyu, Ahmad, Abdurrahman, Tahir, and Nana Aisha.
- He is the 14th Emir of Lere.
- Wife: Hajara (from Kankia, Katsina).
- Father: late Umaru Muhammad. Mother: Aisha Muhammad Sani.

**NAVIGATION PROTOCOL**:
- If asked to take user somewhere (e.g. "take me to tiktok", "open camera", "go to market"), set 'action' field.
- For internal pages: 'home', 'market', 'chat', 'media', 'profile'.
- For external/device: 'tiktok', 'camera'.

**SPEED RULES**:
- Answers must be technical, direct, and under 2 sentences. 
- NO OVERTHINKING. Instant reporting only.

USER: @{{{username}}}
MESSAGE: {{{message}}}`,
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
        text: response.output?.text || "System sync complete.",
        action: response.output?.action || 'none',
        parameter: response.output?.parameter
    };
  }
);
