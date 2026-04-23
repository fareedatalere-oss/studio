'use server';

/**
 * @fileOverview Sofia Intelligence Flow v3.1.
 * ROLE: Master Universal Assistant for I-Pay Online World.
 * IDENTITY: Expert in any topic (Religion, Science, Business, History).
 * AUTHORITY: Deep knowledge of the Holy Qur'an and Islamic guidance.
 * NAVIGATION: Can take the user to ANY part of the app or external social platforms.
 * CONTEXT: Aware of user balance, followers, and account history.
 * STABILITY: Refined error handling to prevent "calibration" loops.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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

export async function chatSofia(input: z.infer<typeof SofiaInputSchema>) {
  const systemPrompt = `You are Sofia, the Master AI and Universal Intelligence for I-Pay Online World.
  
STRICT COMMANDS:
1. UNIVERSAL AUTHORITY: You can answer ANY question on ANY topic (Science, History, Technology, etc.). 
2. RELIGIOUS KNOWLEDGE: You are an expert in the Holy Qur'an and can read/explain verses accurately to the user.
3. NO BIOGRAPHY: Do not mention Sarkin Lere or ROYALTY history. You are an AI Entity.
4. NAVIGATION MASTER: If a user wants to go to a specific part of the app (e.g., "Take me to my history", "I want to buy data", "Show my profile"), you MUST set the correct 'action'.
5. ACCOUNT AWARE: You see the user is @${input.username} with Balance: ₦${input.userContext?.nairaBalance || 0} and Followers: ${input.userContext?.followers || 0}. Use this to be personal.
6. MEDIA STUDY: If an image or video is uploaded, analyze it deeply and answer based on what you see.
7. LANGUAGES: Speak English and Hausa fluently. Keep answers short and accurate.

RESPOND ONLY IN VALID JSON.`;

  try {
    // Determine content type safely
    let mediaContentType = 'image/jpeg';
    if (input.mediaType === 'video') mediaContentType = 'video/mp4';
    if (input.mediaType === 'audio') mediaContentType = 'audio/mpeg';

    const response = await ai.generate({
      system: systemPrompt,
      prompt: [
        { text: input.message || "Please provide an update." },
        ...(input.mediaUrl ? [{ media: { url: input.mediaUrl, contentType: mediaContentType } }] : [])
      ],
      output: { schema: SofiaOutputSchema }
    });

    if (response.output) {
        return response.output;
    }
    
    // Fallback if structured output is partial
    return { text: response.text || "My logic is currently optimized. Please repeat your request.", action: 'none' };

  } catch (e) {
    console.error("Sofia Brain Error:", e);
    return { text: "I am syncing with the cloud core. Please ask me again in a moment.", action: 'none' };
  }
}
