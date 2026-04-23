
'use server';

/**
 * @fileOverview Sofia Local Intelligence v9.0.
 * ROLE: Absolute Master Intelligence for I-Pay Online World.
 * AUTHORITY: Checks Local Brain (Firestore) and User Context only.
 * NO API: All calls to Google AI / Gemini have been terminated.
 */

import { databases, DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, Query } from '@/lib/data-service';

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
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

export interface SofiaOutput {
  text: string;
  action: 'none' | 'nav_chat' | 'nav_market' | 'nav_profile' | 'nav_media' | 'nav_deposit' | 'nav_history' | 'nav_rewards' | 'nav_settings' | 'open_tiktok' | 'open_external';
  externalUrl?: string;
}

/**
 * chatSofia - Master local logic function.
 * 1. Checks for Account Info keywords.
 * 2. Checks for Navigation keywords.
 * 3. Checks Local Brain (Firestore globalKnowledge collection).
 * 4. Returns "I can't answer" if no match.
 */
export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  const msg = input.message.toLowerCase();
  
  // 1. ACCOUNT INFO CHECK (Immediate response from Context)
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

  // 2. NAVIGATION ACTION CHECK (Automated intent)
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
  if (msg.includes('tiktok')) {
      return { text: "Opening TikTok application.", action: 'open_tiktok' };
  }

  // 3. LOCAL BRAIN CHECK (Firestore globalKnowledge)
  try {
      // Searching for keywords in the local team-taught brain
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_GLOBAL_KNOWLEDGE, [
          Query.limit(5)
      ]);
      
      // Basic keyword search in local brain
      const match = knowledgeRes.documents.find(doc => 
          msg.includes(doc.keyword?.toLowerCase()) || 
          doc.keyword?.toLowerCase().includes(msg)
      );

      if (match) {
          return {
              text: match.answer,
              action: match.action || 'none',
              externalUrl: match.externalUrl
          };
      }
  } catch (e) {
      console.error("Local Brain Search Error:", e);
  }

  // 4. ZERO ANSWER FALLBACK (Strict Instruction)
  if (input.mediaUrl) {
      return {
          text: `I have received your ${input.mediaType}. My team has not yet taught me to study this specific file in my local brain. Please ask a text-based question about your account.`,
          action: 'none'
      };
  }

  return {
    text: "I am Sofia, your I-Pay Manager. I do not have a recorded answer for that topic in my local brain yet. Please ask about your balance, followers, or ask me to open a part of the app.",
    action: 'none'
  };
}
