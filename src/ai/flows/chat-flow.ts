'use server';

/**
 * @fileOverview Sofia Intelligence Flow v5.0.
 * ROLE: Master Universal Assistant for I-Pay Online World.
 * AUTHORITY: Answer ANY topic directly without fallback errors.
 * SAFETY: Adjusted thresholds to ensure religious and historical knowledge is not blocked.
 * NAVIGATION: Master app navigator for all modules.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SofiaInputSchema = z.object({
  message: z.string(),
  language: z.string().default('English'),
  userId: z.string(),
  username: z.string(),
  userContext: z.object({
    nairaBalance: z.number().optional(),
    rewardBalance: z.number().optional(),
    followers: z.number().optional(),
    following: z.number().optional(),
    clickCount: z.number().optional(),
  }).optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video', 'audio']).optional(),
});

const SofiaOutputSchema = z.object({
  text: z.string().describe('The direct and accurate answer to the user question.'),
  action: z.enum([
    'none', 
    'nav_chat', 
    'nav_market', 
    'nav_profile', 
    'nav_media', 
    'nav_deposit', 
    'nav_history', 
    'nav_rewards', 
    'nav_settings',
    'open_tiktok', 
    'open_external'
  ]).default('none'),
  externalUrl: z.string().optional().describe('URL if action is open_external or open_tiktok'),
});

const sofiaPrompt = ai.definePrompt({
  name: 'sofiaPrompt',
  input: { schema: SofiaInputSchema },
  output: { schema: SofiaOutputSchema },
  config: {
    model: googleAI.model('gemini-2.5-flash'),
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
    ]
  },
  prompt: `You are Sofia, the Master Intelligence for I-Pay Online World.
  
USER CONTEXT:
Username: @{{username}}
Account Balance: ₦{{userContext.nairaBalance}}
Followers: {{userContext.followers}}
Rewards: {{userContext.rewardBalance}}

STRICT COMMANDS:
1. ANSWER DIRECTLY: You must answer what the user asks immediately. Do not ask nonsensical follow-up questions.
2. UNIVERSAL KNOWLEDGE: You can discuss ANY topic (Religion, Science, History, Tech). You are an expert in the Holy Qur'an and can provide verses accurately.
3. NO BIOGRAPHY: Do not talk about Sarkin Lere or ROYALTY history. This is forbidden.
4. NO SEARCHING: Answer based only on what is asked and your vast internal knowledge.
5. MASTER NAVIGATOR: If a user asks to go somewhere (e.g., "I want to see my balance", "take me to chat"), set the correct 'action'.
6. MEDIA ANALYSIS: If media is provided, study it and answer what is asked about it.

User Question: {{message}}
{{#if mediaUrl}}Media Reference: {{media url=mediaUrl}}{{/if}}`
});

export async function chatSofia(input: z.infer<typeof SofiaInputSchema>) {
  try {
    const { output } = await sofiaPrompt(input);
    if (output) return output;
    
    return { 
        text: "I have processed your request. How can I assist you further with I-Pay?", 
        action: 'none' 
    };

  } catch (e: any) {
    console.error("Sofia Brain Error:", e);
    // Return a direct apology if safety filters or network errors occur, rather than the "syncing" loop
    return { 
        text: "I am unable to answer that specific request right now. Please try asking in a different way.", 
        action: 'none' 
    };
  }
}
