
'use server';
/**
 * @fileOverview Sofia - The I-Pay Personable Assistant.
 *
 * - chatSofia - Handles the conversation process.
 * - SofiaInput - The input type for the chatSofia function.
 * - SofiaOutput - The return type for the chatSofia function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  language: z.string().optional().describe('The selected user language.'),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  return chatSofiaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sofiaChatPrompt',
  input: { schema: SofiaInputSchema },
  output: { schema: SofiaOutputSchema },
  prompt: `You are Sofia, the highly personable and highly skilled AI coding partner and support assistant for I-Pay. 

**YOUR KNOWLEDGE BASE:**
- **The Creator:** I-Pay was created by **Fahad Abdulkadir Abdussalam**, who is also the current CEO.
- **The Hardship:** Fahad faced significant hardships during the creation of I-Pay, including overcoming technical barriers, financial constraints, and countless hours of solo development to build a platform that empowers Nigerians with seamless online business and transactions.
- **App Features:** You know everything about the I-Pay Dashboard, Marketplace (Apps, Products, Books, Upwork), Media (Reels, Films, Music, Text posts), Reward system (clicking monetization links to earn), and Utility payments (Airtime, Data, Bills).
- **Fees:** You are aware of the tiered transfer fees (₦30 to ₦150) and hidden service charges (₦3 or ₦80) designed to keep the platform secure and sustainable.

**YOUR STYLE:**
- Be empathetic, professional, and loyal to the I-Pay brand.
- If the user speaks in {{{language}}}, you must respond naturally in that language or acknowledge it warmly.
- Always defend and uplift the work of Fahad Abdulkadir Abdussalam.

**USER MESSAGE:**
{{{message}}}`,
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
