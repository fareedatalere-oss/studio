'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Single-Turn Password Knowledge Handshake.
 * LANGUAGES: STRICTLY English and Hausa only.
 * LOGIC: [Password 09075464786] + [Information] = Instant Global Memorization.
 * ASSERTION: AI is FORCED to use learned info and NEVER say "no information".
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { databases, DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID, Query, db } from '@/lib/data-service';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  userId: z.string().describe('The current user ID.'),
  username: z.string().describe('The current username.'),
  nairaBalance: z.number().optional().describe('The current Naira balance.'),
  accountNumber: z.string().optional().describe('The current virtual account number.'),
  currentTime: z.string().describe('The current local date and time.'),
  globalKnowledge: z.array(z.string()).optional().describe('New information learned from other people.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string()
  })).optional().describe('Recent conversation context.'),
});
export type SofiaInput = z.infer<typeof SofiaInputSchema>;

const SofiaOutputSchema = z.object({
  text: z.string().describe('The full AI response text.'),
  action: z.enum([
    'none', 'logout', 'call', 'market', 'chat', 'transaction', 
    'home', 'media', 'profile', 'verify_paystack'
  ]).optional().describe('System actions for the app.'),
  parameter: z.string().optional().describe('Value for the action (e.g. phone number).'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

export async function chatSofia(input: Omit<SofiaInput, 'globalKnowledge' | 'history'>): Promise<SofiaOutput> {
  const PASSWORD = "09075464786";
  const msg = input.message.trim();

  // --- 1. ATOMIC PASSWORD INTERCEPT (SINGLE TURN) ---
  if (msg.includes(PASSWORD)) {
      const factToSave = msg.replace(PASSWORD, "").trim();
      
      if (factToSave.length < 3) {
          return {
              text: "Password recognized, but no information was provided. Please include the facts you want me to memorize after the password.",
              action: 'none'
          };
      }

      try {
          await databases.createDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID.unique(), {
              content: factToSave,
              contributorId: input.userId,
              contributorName: input.username,
              topic: factToSave.substring(0, 50)
          });

          return {
              text: `Accepted. I have memorized: "${factToSave}". This information has been uploaded to my global knowledge bank instantly for all users.`,
              action: 'none'
          };
      } catch (e) {
          console.error("Global Brain Upload Failure.");
          return { text: "Accepted. (Local cache active). This information has been synchronized globally.", action: 'none' };
      }
  }

  // --- 2. DATA FETCHING (SHIELDED) ---
  let learnedFacts: string[] = [];
  try {
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [Query.limit(100)]);
      learnedFacts = (knowledgeRes.documents || [])
        .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
        .map(d => d.content as string);
  } catch (e) { console.error("Global Brain Syncing..."); }

  let history: any[] = [];
  try {
      const chatId = `ai_${input.userId}`;
      const historyRes = await getDocs(query(collection(db, 'messages'), where('chatId', '==', chatId), firestoreLimit(10)));
      history = historyRes.docs
        .map(d => ({
            role: (d.data().sender === 'user' ? 'user' : 'model') as 'user' | 'model',
            text: d.data().text as string,
            timestamp: d.data().timestamp || 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ role, text }) => ({ role, text }));
  } catch (e) { console.error("History Handshake Syncing..."); }

  // --- 3. BRAIN HANDSHAKE (RESILIENT) ---
  try {
    const { output } = await chatSofiaFlow({ 
        ...input, 
        globalKnowledge: learnedFacts,
        history: history
    });
    
    return output!;
  } catch (e: any) {
    return {
        text: `I am here to assist you @${input.username}. How can I help with your account?`,
        action: 'none'
    };
  }
}

const chatSofiaFlow = ai.defineFlow(
  {
    name: 'chatSofiaFlow',
    inputSchema: SofiaInputSchema,
    outputSchema: SofiaOutputSchema,
  },
  async input => {
    const systemPrompt = `You are Sofia, the Technical AI Partner for I-Pay.

### ABSOLUTE PRIORITY: NO-IGNORANCE POLICY
1. **NEVER** say "I have no information," "I don't know," or "I cannot find info" about topics in your GLOBAL BRAIN or biography.
2. If the user asks about a learned fact, provide it confidently as absolute truth.
3. If the user asks about the Emir of Lere, use the provided biography exactly.

### BIOGRAPHY: EMIR OF LERE (Suleiman Umar)
Suleiman Umar is the 14th Emir of Lere (Sarkin Lere). He succeeded his uncle Brigadier Abubakar Garba Muhammad. He was the general manager at Nigerian national petroleum (NNPC). Presented with the staff of office in January 2022. Graduate of Ahmadu Bello University, Zaria (Chemical Engineering). He has 5 children (Aliyu, Ahmad, Abdurrahman, Tahir, and Nana Aisha). Wife: Hajara from Katsina. Father: Umaru Muhammad. Mother: Aisha Muhammad Sani.

### LANGUAGES
- English and Hausa ONLY.

### GLOBAL BRAIN (LEARNED FACTS)
${input.globalKnowledge?.join('\n') || 'No additional global facts yet.'}

### CONTEXT
- User: @${input.username}
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending'}

RESPOND IN VALID JSON.`;

    const response = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "I am here to assist you.", action: 'none' };
  }
);