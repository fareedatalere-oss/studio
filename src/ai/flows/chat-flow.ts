
'use server';

/**
 * @fileOverview Sofia Master Intelligence v11.0.
 * ROLE: Absolute Master Intelligence for I-Pay Online World.
 * LOGIC: Brain Bank First -> Google Search Fallback.
 * NO NONSENSE: If the taught brain is empty, she uses live Google data.
 */

import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, Query } from '@/lib/data-service';
import { ai, z } from '@/ai/genkit';
import { format } from 'date-fns';

export interface SofiaInput {
  message: string;
  language?: string;
  userId: string;
  username: string;
  userContext?: {
    nairaBalance?: number;
    rewardBalance?: number;
    followers?: number;
    following?: number;
    clickCount?: number;
  };
}

export interface SofiaOutput {
  text: string;
  action: 'none' | 'nav_chat' | 'nav_market' | 'nav_profile' | 'nav_media' | 'nav_deposit' | 'nav_history' | 'nav_rewards' | 'nav_settings' | 'open_tiktok' | 'open_external';
  externalUrl?: string;
  voiceUrl?: string;
}

/**
 * chatSofia - Master hybrid intelligence function.
 */
export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  const msg = input.message.toLowerCase().trim();
  const now = new Date();
  
  // 1. GREETING & ACCOUNT PROTOCOL
  if (msg === 'hi' || msg === 'hello' || msg === 'hey') {
    const dateStr = format(now, 'PPPP');
    return {
        text: `Hello @${input.username}! Today is ${dateStr}. How can I help you today with I-Pay?`,
        action: 'none'
    };
  }
  
  if (msg.includes('balance') || msg.includes('naira')) {
    return {
        text: `Hello @${input.username}, your wallet balance is ₦${input.userContext?.nairaBalance?.toLocaleString() || '0.00'}.`,
        action: 'none'
    };
  }

  // Navigation Intents
  if (msg.includes('go to chat')) return { text: "Opening your chat hub.", action: 'nav_chat' };
  if (msg.includes('market')) return { text: "Navigating to the Marketplace.", action: 'nav_market' };
  if (msg.includes('deposit')) return { text: "Opening the deposit vault.", action: 'nav_deposit' };

  // 2. BRAIN BANK SEARCH (Priority 1)
  try {
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, [
          Query.limit(100)
      ]);
      
      const match = knowledgeRes.documents.find(doc => 
          msg.includes(doc.keyword?.toLowerCase()) || 
          doc.keyword?.toLowerCase().includes(msg)
      );

      if (match) {
          return {
              text: match.answer,
              action: match.action || 'none',
              voiceUrl: match.voiceUrl || undefined
          };
      }
  } catch (e) {
      console.error("Brain Bank bypass due to local error.");
  }

  // 3. GOOGLE SEARCH FALLBACK (Priority 2)
  try {
      const response = await ai.generate({
          prompt: `You are Sofia, the I-Pay Online World assistant. User @${input.username} asked: "${input.message}". 
                   If the question is about I-Pay features not in your context, use Google Search to provide a helpful, concise answer.
                   Context: I-Pay is a digital banking, social media, and marketplace platform in Nigeria.`,
          config: {
              googleSearchRetrieval: true,
          }
      });

      return {
          text: response.text || "I'm having trouble connecting to my knowledge base. Please try again.",
          action: 'none'
      };
  } catch (e: any) {
      console.error("AI Fallback Error:", e.message);
      return {
          text: "I couldn't find an answer in my brain or via search. Please ask something else.",
          action: 'none'
      };
  }
}
