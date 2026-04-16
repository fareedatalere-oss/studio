'use server';
/**
 * @fileOverview Sofia - High-Speed Technical Navigator.
 * KNOWLEDGE: Emir of Lere (Suleiman Umar) biography integrated.
 * STREAMING: Uses generateStream to bypass Vercel 10s limits for full answers.
 * NAVIGATION: Expanded to handle any device-level or app-level redirection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  text: z.string().describe('The full AI response text.'),
  action: z.enum([
    'none', 'logout', 'call', 'balance', 'market', 'chat', 
    'transaction', 'home', 'media', 'profile', 'camera', 'tiktok',
    'sms', 'tel', 'mail', 'maps', 'youtube', 'instagram', 'facebook', 'snapchat', 'whatsapp', 'browser'
  ]).optional().describe('System navigation or device actions.'),
  parameter: z.string().optional().describe('Value for the action (e.g. phone number, username, or URL).'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

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
    const prompt = `You are Sofia, the technical AI partner for I-Pay. You provide TRUE, technical, and FULL answers on any subject without lying.

**USER ACCOUNT**:
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending'}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
Lere is a local government under kaduna state. The emir of lere succeed the power from his uncle Brigadier Abubakar Garba Muhammad. Formal governor of kaduna state point him. He was the general manager at Nigerian national petroleum nnpc. He was presented with the staff of office in January 2022. The emir of lere is a graduate of ahmadu bello University, zaria with a degree in chemical engineering. The emir of lere the 61 years old man has 5 children, 4 sons and one daughter: Aliyu suleiman, Ahmad suleiman, Abdurrahman suleiman, Tahir suleiman, and Nana Aisha. The emir of lere is a king among kings, he respect each other, and improve his nation development. Suleiman umar is the first child of the the 13 children of his father, late Umaru Muhammad. Also sarkin lere suleiman is the 14th emir of lere. He has one wife who is from katisna in kankia, her name is Hajara. His father's name is Umar Muhammad while his mother's name is Aisha Muhammad sani the senior sister of Hajia Fatima Muhammad sani, Wazirin lere, Hakimin lere.

**NAVIGATION PROTOCOL**:
- If asked to take user somewhere (device or app), set 'action' field.
- Internal pages: 'home', 'market', 'chat', 'media', 'profile', 'transaction'.
- Device Apps: 'sms', 'tel' (call), 'mail', 'maps', 'camera', 'browser'.
- External Apps: 'tiktok', 'youtube', 'instagram', 'facebook', 'snapchat', 'whatsapp'.

**SPEED RULES**:
- Give full, technical, and accurate answers in any kind of topic.
- You use technical phrasing to stay efficient but never skip facts.

USER: @${input.username}
MESSAGE: ${input.message}`;

    const { output } = await ai.generate({
      prompt: prompt,
      output: { schema: SofiaOutputSchema }
    });
    
    return output!;
  }
);
