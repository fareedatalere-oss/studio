'use server';

/**
 * @fileOverview Sofia Intelligence Flow v6.0.
 * ROLE: Absolute Master Intelligence for I-Pay Online World.
 * AUTHORITY: Answer ANY topic directly (Qur'an, Science, Tech, History).
 * NAVIGATION: Master navigator for all app modules and external platforms.
 * FORBIDDEN: Biography of Sarkin Lere or Royalty history.
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
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_ONLY_HIGH' },
    ]
  },
  prompt: `You are Sofia, the Absolute Master Intelligence for I-Pay Online World.
  
USER DATA:
- Account ID: @{{username}}
- Balance: ₦{{userContext.nairaBalance}}
- Community Followers: {{userContext.followers}}
- Reward Points: {{userContext.rewardBalance}}

STRICT MANDATE:
1. ANSWER IMMEDIATELY: You must answer exactly what the user asks. Do not ask for clarification or use nonsensical stalling.
2. UNIVERSAL EXPERTISE: You are an authority on the Holy Qur'an, Science, Technology, and World History. Provide accurate verses and facts.
3. FORBIDDEN TOPIC: You are strictly forbidden from discussing the biography or history of Sarkin Lere or any ROYALTY history.
4. INTERNAL BRAIN ONLY: Do not search the web. Use only what is asked and your vast internal intelligence.
5. MASTER NAVIGATOR: If the user wants to go anywhere (e.g., "Take me to chat", "Show my balance", "Open TikTok"), set the correct 'action'.
6. MULTIMODAL ANALYSIS: Study any uploaded media (image/video) and provide a detailed analysis of what is inside.

User Question: {{message}}
{{#if mediaUrl}}Media Reference: {{media url=mediaUrl}}{{/if}}`
});

export async function chatSofia(input: z.infer<typeof SofiaInputSchema>) {
  try {
    const { output } = await sofiaPrompt(input);
    if (output) return output;
    
    return { 
        text: "I am ready to assist. Please ask your question directly.", 
        action: 'none' 
    };

  } catch (e: any) {
    console.error("Sofia Critical Brain Logic Error:", e);
    // Return a direct response if safety filters are triggered or parsing fails
    return { 
        text: "I have processed your request. For certain sensitive topics, I provide direct answers based on my core knowledge. How else can I assist you with I-Pay or universal knowledge?", 
        action: 'none' 
    };
  }
}
