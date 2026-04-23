
'use server';

/**
 * @fileOverview Sofia Local Intelligence v9.0.
 * ROLE: Absolute Master Intelligence for I-Pay Online World.
 * AUTHORITY: Checks User Context -> Greetings -> Local Brain (Firestore).
 * NO API: All external cloud calls have been terminated.
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
  
  // 1. GREETING PROTOCOL (Immediate - No Brain Search)
  if (msg === 'hi' || msg === 'hello' || msg === 'hey') {
    const timeStr = format(now, 'HH:mm');
    const dateStr = format(now, 'PPPP');
    // Mock weather as requested for internal logic
    const weather = "Clear skies and Sunny"; 
    
    return {
        text: `Hello @${input.username}! Today is ${dateStr}. The time is ${timeStr} and the weather is ${weather}. How can I help you today with I-Pay?`,
        action: 'none'
    };
  }
  
  // 2. ACCOUNT & NAVIGATION CHECK (Immediate - No Brain Search)
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

  if (msg.includes('reward') || msg.includes('point')) {
    return {
        text: `Your current Reward Points balance is ${input.userContext?.rewardBalance?.toLocaleString() || '0'}. Keep interacting to earn more!`,
        action: 'nav_rewards'
    };
  }

  // Automated Navigation Intents
  if (msg.includes('go to chat') || msg.includes('open chat') || msg.includes('message someone')) {
      return { text: "Opening your private chat hub now.", action: 'nav_chat' };
  }
  if (msg.includes('market') || msg.includes('buy') || msg.includes('sell') || msg.includes('store')) {
      return { text: "Navigating to the I-Pay Marketplace. Browse apps, items, and books.", action: 'nav_market' };
  }
  if (msg.includes('deposit') || msg.includes('fund') || msg.includes('add money')) {
      return { text: "Opening the secure deposit vault.", action: 'nav_deposit' };
  }
  if (msg.includes('history') || msg.includes('transactions') || msg.includes('receipt')) {
      return { text: "Opening your master transaction ledger.", action: 'nav_history' };
  }
  if (msg.includes('setting') || msg.includes('change pin') || msg.includes('edit profile')) {
      return { text: "Taking you to your security and account settings.", action: 'nav_settings' };
  }
  if (msg.includes('take me to') || msg.includes('other side')) {
      return { text: "Pivoting your application view now.", action: 'nav_market' };
  }

  // 3. LOCAL BRAIN BANK CHECK (Firestore globalKnowledge)
  try {
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, [
          Query.limit(100)
      ]);
      
      // Search for keyword matches in your team's bank
      const match = knowledgeRes.documents.find(doc => 
          msg.includes(doc.keyword?.toLowerCase()) || 
          doc.keyword?.toLowerCase().includes(msg)
      );

      if (match) {
          return {
              text: match.answer,
              action: match.action || 'none',
              voiceUrl: match.voiceUrl
          };
      }
  } catch (e) {
      console.error("Local Brain Search Error:", e);
  }

  // 4. ZERO ANSWER FALLBACK (Strict Instruction)
  return {
    text: "I can't answer. Please ask a different question or ask about your account.",
    action: 'none'
  };
}
