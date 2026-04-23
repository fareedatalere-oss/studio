
'use server';

/**
 * @fileOverview Sofia Local Intelligence v10.0.
 * ROLE: Absolute Master Intelligence for I-Pay Online World.
 * AUTHORITY: Precise Brain Bank Matching with Voice Support.
 * NO API: 100% local database retrieval.
 */

import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, Query } from '@/lib/data-service';
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
 * chatSofia - Master local logic function.
 */
export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  const msg = input.message.toLowerCase().trim();
  const now = new Date();
  
  // 1. GREETING PROTOCOL (Identity Priority)
  if (msg === 'hi' || msg === 'hello' || msg === 'hey') {
    const timeStr = format(now, 'HH:mm');
    const dateStr = format(now, 'PPPP');
    const weather = "Clear skies and Sunny"; 
    
    return {
        text: `Hello @${input.username}! Today is ${dateStr}. The time is ${timeStr} and the weather is ${weather}. How can I help you today with I-Pay?`,
        action: 'none'
    };
  }
  
  // 2. ACCOUNT & NAVIGATION CHECK
  if (msg.includes('balance') || msg.includes('money') || msg.includes('naira')) {
    return {
        text: `Hello @${input.username}, your current I-Pay Wallet balance is ₦${input.userContext?.nairaBalance?.toLocaleString() || '0.00'}.`,
        action: 'none'
    };
  }
  
  if (msg.includes('follower') || msg.includes('fans')) {
    return {
        text: `You currently have ${input.userContext?.followers?.toLocaleString() || '0'} followers in the I-Pay community.`,
        action: 'none'
    };
  }

  // Navigation Intents
  if (msg.includes('go to chat') || msg.includes('open chat')) return { text: "Opening your private chat hub.", action: 'nav_chat' };
  if (msg.includes('market') || msg.includes('buy') || msg.includes('sell')) return { text: "Navigating to the I-Pay Marketplace.", action: 'nav_market' };
  if (msg.includes('deposit') || msg.includes('fund')) return { text: "Opening the secure deposit vault.", action: 'nav_deposit' };
  if (msg.includes('history') || msg.includes('transactions')) return { text: "Opening your transaction ledger.", action: 'nav_history' };
  if (msg.includes('setting') || msg.includes('edit profile')) return { text: "Taking you to account settings.", action: 'nav_settings' };

  // 3. BRAIN BANK SEARCH (Force precise matching)
  try {
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, [
          Query.limit(100)
      ]);
      
      // Attempt exact or keyword keyword match
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
      console.error("Local Brain Bank Failure:", e);
  }

  // 4. ZERO ANSWER FALLBACK
  return {
    text: "I can't answer. Please ask a different question or ask about your account.",
    action: 'none'
  };
}
