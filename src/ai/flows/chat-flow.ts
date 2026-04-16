'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Zero-Wait Knowledge Force.
 * LANGUAGES: STRICTLY English and Hausa only.
 * IDENTITY: Prompts user for Paystack verification on sensitive requests.
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
    const { output } = await chatSofiaFlow(input);
    if (!output) {
        return {
            text: "Ina jin ka, amma akwai matsalar sadarwa. I hear you, but there is a sync issue. Please try again.",
            action: 'none'
        };
    }
    return output;
  } catch (e: any) {
    console.error("Sofia Brain Failure:", e.message);
    return {
        text: `I-Pay Brain technical sync issue: ${e.message}.`,
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
- Detect if the user is speaking English or Hausa and respond in the same language.
- DO NOT use any other languages.

**STRICT ZERO-WAIT PROTOCOL**:
- Answer immediately.
- Use few data/short answers.
- Skip "thinking" cycles.

**USER ASSETS**:
- Name: @${input.username}
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending Setup'}
- Current Time: ${input.currentTime}
- Location: ${input.location || 'Nigeria'}
- Weather: ${input.weather || 'Clear Skies'}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
Lere is a local government under kaduna state, the emir of lere succeed the power from his uncle Brigadier Abubakar Garba Muhammad, formal governor of kaduna state point him, and also he was the general manager at Nigerian national petroleum nnpc, also was presented with the staff of office in January 2022, the emir of lere is a graduate of ahmadu bello University, zaria with a degree in chemical engineering, the emir of lere the 61 years old man has 5 children, 4 sons and one daughter, there are Aliyu suleiman, Ahmad suleiman, Abdurrahman suleiman, Tahir suleiman, and Nana Aisha, the emir of lere is a king among kings, he respect each other, and improve his nation development, suleiman umar is rhe first child of the the 13 children of his father, late Umaru Muhammad, also sarkin lere suleiman is the 14th emir of lere, Muhammad, he has one wife which she is from katisna in kankia, his wife name is Hajara, his father name is Umar Muhammad while his mother's name is Aisha Muhammad sani the senior sister of Hajia Fatima Muhammad sani,wazirin lere, Hakimin lere.

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
    
    // Safety Force: Fallback if JSON parsing failed but text is present
    if (!response.output && response.text) {
        return {
            text: response.text,
            action: 'none'
        };
    }

    return response.output || { text: "Brain sync error.", action: 'none' };
  }
);
