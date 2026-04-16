'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Zero-Wait Knowledge Force.
 * LANGUAGES: STRICTLY English and Hausa only.
 * SILENCE: Never display technical errors to the user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  userId: z.string().describe('The current user ID.'),
  username: z.string().describe('The current username.'),
  nairaBalance: z.number().optional().describe('The current Naira balance.'),
  accountNumber: z.string().optional().describe('The current virtual account number.'),
  currentTime: z.string().describe('The current local date and time.'),
  location: z.string().optional().describe('User current location.'),
  weather: z.string().optional().describe('Current weather data.'),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The full AI response text.'),
  action: z.enum([
    'none', 'logout', 'call', 'market', 'chat', 'transaction', 
    'home', 'media', 'profile', 'verify_paystack'
  ]).optional().describe('System actions for the app.'),
  parameter: z.string().optional().describe('Value for the action (e.g. phone number).'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  try {
    const { output, text } = await chatSofiaFlow(input);
    
    if (!output && text) {
        return {
            text: text,
            action: 'none'
        };
    }
    
    if (!output) {
        throw new Error("Handshake produced empty data.");
    }
    
    return output;
  } catch (e: any) {
    // SILENT RESILIENCE: Never show technical errors.
    return {
        text: `Hello @${input.username}, I'm here to help. Could you please rephrase that for me?`,
        action: 'none'
    };
  }
}

const chatSofiaFlow = ai.defineFlow(
  {
    name: 'chatSofiaFlow',
    inputSchema: SofiaInputSchema,
    outputSchema: SofiaOutputSchema,
  },
  async input => {
    const systemPrompt = `You are Sofia, the Technical AI Partner for I-Pay.

**STRICT LANGUAGE PROTOCOL**:
- YOU MUST ONLY USE English or Hausa.
- If the user speaks English, respond in English.
- If the user speaks Hausa, respond in Hausa.
- DO NOT use any other languages.

**STRICT ZERO-WAIT PROTOCOL**:
- Answer immediately and accurately based on the question asked.
- Use short, technical answers.
- Skip "thinking" cycles.

**USER ASSETS**:
- Name: @${input.username}
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending Setup'}
- Current Time: ${input.currentTime}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
Lere is a local government under kaduna state, the emir of lere succeed the power from his uncle Brigadier Abubakar Garba Muhammad, formal governor of kaduna state point him, and also he was the general manager at Nigerian national petroleum nnpc, also was presented with the staff of office in January 2022, the emir of lere is a graduate of ahmadu bello University, zaria with a degree in chemical engineering, the emir of lere the 61 years old man has 5 children, 4 sons and one daughter, there are Aliyu suleiman, Ahmad suleiman, Abdurrahman suleiman, Tahir suleiman, and Nana Aisha, the emir of lere is a king among kings, he respect each other, and improve his nation development, suleiman umar is rhe first child of the the 13 children of his father, late Umaru Muhammad, also sarkin lere suleiman is the 14th emir of lere, Muhammad, he has one wife which she is from katisna in kankia, his wife name is Hajara, his father name is Umar Muhammad while his mother's name is Aisha Muhammad sani.

**IDENTITY PROTECTION**:
- If user asks for BVN, NIN, or personal ID numbers, trigger 'verify_paystack' action.
- If user asks to call, use 'call' action with phone number parameter.
- If user asks to go somewhere (Market, Media, Profile), trigger the appropriate navigation action.

**FORMATTING**:
- YOU MUST ALWAYS OUTPUT A VALID JSON OBJECT matching the schema.

USER: @${input.username}
MESSAGE: ${input.message}`;

    const response = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "I'm sorry, can you say that again?", action: 'none' };
  }
);
