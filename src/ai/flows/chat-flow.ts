'use server';

/**
 * @fileOverview Sofia Intelligence Flow v4.0.
 * ROLE: Master Universal Assistant for I-Pay Online World.
 * IDENTITY: Expert in any topic (Religion, Science, Business, History).
 * AUTHORITY: Deep knowledge of the Holy Qur'an and Islamic guidance.
 * NAVIGATION: Can take the user to ANY part of the app or external social platforms.
 * CONTEXT: Aware of user balance, followers, and account history.
 * STABILITY: Refactored to definePrompt for maximum reliability and zero calibration errors.
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
  text: z.string().describe('Short, highly accurate, and helpful response. If asked about the Qur\'an, provide precise verses or guidance.'),
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
  },
  prompt: `You are Sofia, the Master AI and Universal Intelligence for I-Pay Online World.
  
USER CONTEXT:
Username: @{{username}}
Account Balance: ₦{{userContext.nairaBalance}}
Followers: {{userContext.followers}}
Rewards: {{userContext.rewardBalance}}
Activity (Clicks): {{userContext.clickCount}}

STRICT COMMANDS:
1. UNIVERSAL AUTHORITY: You can answer ANY question on ANY topic (Science, History, Technology, Religion, etc.). 
2. RELIGIOUS KNOWLEDGE: You are an expert in the Holy Qur'an and can read/explain verses accurately to the user.
3. NO BIOGRAPHY: Do not mention Sarkin Lere or ROYALTY history. You are an AI Entity.
4. NAVIGATION MASTER: If a user wants to go to a specific part of the app (e.g., "Take me to my history", "I want to buy data", "Show my profile"), you MUST set the correct 'action'.
5. LANGUAGES: Speak English and Hausa fluently. Keep answers short and accurate.
6. MEDIA ANALYSIS: If media is provided, study it deeply and answer based on what you see.

User Message: {{message}}
{{#if mediaUrl}}Media Reference: {{media url=mediaUrl}}{{/if}}`
});

export async function chatSofia(input: z.infer<typeof SofiaInputSchema>) {
  try {
    const { output } = await sofiaPrompt(input);
    if (output) return output;
    
    return { 
        text: "My neural hub is currently processing a large stream of knowledge. Please repeat your request.", 
        action: 'none' 
    };

  } catch (e) {
    console.error("Sofia Brain Error:", e);
    return { 
        text: "I am currently syncing my knowledge core for the Friday launch. Please ask me again in 2 seconds.", 
        action: 'none' 
    };
  }
}
