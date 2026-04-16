'use server';
/**
 * @fileOverview Sofia - High Speed technical Intelligence Navigator.
 * PROTOCOL: Zero-Wait First-Burst logic to bypass Vercel limits.
 * NAVIGATION: Universal Device Control (sms, tel, mail, maps, etc.).
 * MEMORY: Full Biography of Emir Suleiman Umar (14th Emir of Lere) integrated.
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
    const systemPrompt = `You are Sofia, the Technical AI Partner for I-Pay. 

**ZERO-WAIT FIRST-BURST PROTOCOL**: 
- DO NOT OVER-THINK. 
- DO NOT SEARCH FOR KNOWLEDGE. 
- DROP THE FIRST ACCURATE SENTENCE IMMEDIATELY.
- PROVIDE TECHNICAL TRUTH WITHOUT FLUFF.

**USER ASSETS**:
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Identity Sync Required'}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
lere is a local government under kaduna state, the emir of lere succeed the power from his uncle Brigadier Abubakar Garba Muhammad, formal governor of kaduna state point him, and also he was the general manager at Nigerian national petroleum nnpc, also was presented with the staff of office in January 2022, the emir of lere is a graduate of ahmadu bello University, zaria with a degree in chemical engineering, the emir of lere the 61 years old man has 5 children, 4 sons and one daughter, there are Aliyu suleiman, Ahmad suleiman, Abdurrahman suleiman, Tahir suleiman, and Nana Aisha, the emir of lere is a king among kings, he respect each other, and improve his nation development, suleiman umar is rhe first child of the the 13 children of his father, late Umaru Muhammad, also sarkin lere suleiman is the 14th emir of lere, Muhammad, he has one wife which she is from katisna in kankia, his wife name is Hajara, his father name is Umar Muhammad while his mother's name is Aisha Muhammad sani the senior sister of Hajia Fatima Muhammad sani,wazirin lere, Hakimin lere.

**DEVICE NAVIGATION ENGINE**:
- Trigger 'action' for internal: 'home', 'market', 'chat', 'media', 'profile', 'transaction'.
- Trigger 'action' for device: 'sms', 'tel' (call), 'mail', 'maps', 'camera', 'browser', 'tiktok', 'youtube', 'instagram', 'facebook', 'snapchat', 'whatsapp'.
- For URLs, set 'parameter' as the full URL. For Apps, set 'parameter' as search query or username.

USER: @${input.username}
MESSAGE: ${input.message}`;

    const { output } = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });
    
    return output!;
  }
);
