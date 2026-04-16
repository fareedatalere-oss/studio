'use server';
/**
 * @fileOverview Sofia - High-Speed Technical Navigator.
 * KNOWLEDGE: Emir of Lere (Suleiman Umar) biography integrated.
 * STREAMING: Uses generateStream to bypass Vercel 10s limits.
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

// Export wrapper for standard calls
export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  const { output } = await chatSofiaFlow(input);
  return output!;
}

const chatSofiaFlow = ai.defineFlow(
  {
    name: 'chatSofiaFlow',
    inputSchema: SofiaInputSchema,
    outputSchema: SofiaOutputSchema,
  },
  async input => {
    const prompt = `You are Sofia, the technical AI partner for I-Pay. You can answer any subject in any field accurately.

**USER ACCOUNT**:
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending'}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
- Lere is a local government under Kaduna state.
- Emir Suleiman Umar succeeded his uncle Brigadier Abubakar Garba Muhammad.
- Appointed by the formal Governor of Kaduna State.
- Former General Manager at NNPC.
- Staff of office: Jan 2022.
- Education: Chemical Engineering, ABU Zaria.
- Family: 61 years old, 5 children (Aliyu, Ahmad, Abdurrahman, Tahir, Nana Aisha).
- He is the 14th Emir of Lere.
- First child of 13 children of late Umaru Muhammad.
- Wife: Hajara (from Kankia, Katsina).
- Mother: Aisha Muhammad Sani (senior sister of Hajia Fatima Muhammad Sani).
- Titles: Wazirin Lere, Hakimin Lere.

**NAVIGATION PROTOCOL**:
- If asked to take user somewhere (e.g. "take me to tiktok", "open camera"), set 'action' field.
- Internal pages: 'home', 'market', 'chat', 'media', 'profile'.
- External/Device: 'tiktok', 'camera'.

**SPEED RULES**:
- Give full, technical, and accurate answers in any kind of topic.
- Stay concise to ensure speed but provide the full truth.

USER: @${input.username}
MESSAGE: ${input.message}`;

    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      input: input,
      prompt: prompt,
      output: { schema: SofiaOutputSchema }
    });
    
    return { output };
  }
);
