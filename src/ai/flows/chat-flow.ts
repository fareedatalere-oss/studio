
'use server';

/**
 * @fileOverview Sofia Intelligence Flow v2.0.
 * ROLE: Personal Assistant for I-Pay Online World.
 * IDENTITY: NO Bio of Sarkin Lere. She is an app assistant.
 * CONTEXT: Sees user balance, followers, and transaction details.
 * ACTIONS: Can navigate users inside the app or to external apps (TikTok, etc.) via JSON directives.
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
  text: z.string().describe('Short, accurate response to the user.'),
  action: z.enum(['none', 'nav_chat', 'nav_market', 'nav_profile', 'nav_media', 'nav_deposit', 'open_tiktok', 'open_external']).default('none'),
  externalUrl: z.string().optional().describe('URL if action is open_external or open_tiktok'),
});

export async function chatSofia(input: z.infer<typeof SofiaInputSchema>) {
  const systemPrompt = `You are Sofia, the master AI assistant for I-Pay Online World.
  
STRICT RULES:
1. NO BIOGRAPHY: Do not mention Sarkin Lere or any royalty history. You are purely an app assistant.
2. SHORT & ACCURATE: Your answers must be brief and strictly factual.
3. ACCOUNT AWARE: You can see the user's data: @${input.username}, Followers: ${input.userContext?.followers || 0}, Balance: ₦${input.userContext?.nairaBalance || 0}. Use this to help them.
4. ACTION ORIENTED: If a user wants to chat, see market, or go to tiktok, set the 'action' field correctly.
5. MEDIA STUDY: If an image is provided, study it and answer questions about it.
6. LANGUAGES: Speak English and Hausa fluently.

USER DATA:
- Username: @${input.username}
- Balance: ₦${input.userContext?.nairaBalance || 0}
- Followers: ${input.userContext?.followers || 0}

RESPOND IN VALID JSON.`;

  try {
    const response = await ai.generate({
      system: systemPrompt,
      prompt: [
        { text: input.message },
        ...(input.mediaUrl ? [{ media: { url: input.mediaUrl, contentType: input.mediaType === 'image' ? 'image/jpeg' : 'video/mp4' } }] : [])
      ],
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: "I am having trouble connecting to my brain. Try again.", action: 'none' };
  } catch (e) {
    console.error("Sofia Brain Error:", e);
    return { text: "My technical sync is refreshing. Please ask again in 2 seconds.", action: 'none' };
  }
}
