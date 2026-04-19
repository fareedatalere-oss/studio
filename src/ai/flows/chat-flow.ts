'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Per-Fact Password Gate with Direct Logic Intercept.
 * LANGUAGES: STRICTLY English and Hausa only.
 * SEQUENCE: "I want to add your knowledge" -> "09075464786" -> [Fact of any length].
 * PERSISTENCE: Learned facts are stored globally and reset per topic.
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
  memorize: z.string().optional().describe('A summarized fact or phrase to remember globally for all users.'),
});
export type SofiaOutput = z.infer<typeof SofiaOutputSchema>;

export async function chatSofia(input: Omit<SofiaInput, 'globalKnowledge' | 'history'>): Promise<SofiaOutput> {
  // --- 1. DATA FETCHING (SHIELDED) ---
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

  // --- 2. DIRECT LOGIC INTERCEPT (PROTOCOL FORCE) ---
  const msg = input.message.trim().toLowerCase();
  const lastSofiaMsg = history.length > 0 ? history[history.length - 1] : null;

  // STEP 1: Trigger
  if (msg === "i want to add your knowledge") {
      return {
          text: "Password required for global knowledge expansion. Please enter the authorized PIN.",
          action: 'none'
      };
  }

  // STEP 2: Password
  if (msg === "09075464786") {
      return {
          text: "Password accepted. What should I remember globally for all users? (Provide any information, I will memorize it instantly without searching)",
          action: 'none'
      };
  }

  // STEP 3: Memorization Gate Check
  const isLearningPhase = lastSofiaMsg?.role === 'model' && lastSofiaMsg.text.includes("Password accepted");

  // --- 3. BRAIN HANDSHAKE (RESILIENT) ---
  try {
    const { output } = await chatSofiaFlow({ 
        ...input, 
        globalKnowledge: learnedFacts,
        history: history
    });
    
    if (!output) throw new Error("Internal Silence Shield.");

    // FORCE MEMORIZE: Immediate acceptance and global commit
    if (isLearningPhase && output.memorize) {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID.unique(), {
            content: output.memorize,
            contributorId: input.userId,
            contributorName: input.username,
            topic: input.message.substring(0, 50)
        });
        // Override text to confirm instant global commit as requested
        output.text = `Accepted. This information has been uploaded to my global knowledge bank instantly. The protocol is now reset. To add more, use the trigger phrase again.`;
    }
    
    return output;
  } catch (e: any) {
    // INTERNAL FALLBACK (Silent Resilience)
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
    const lastMsg = input.history?.length ? input.history[input.history.length - 1] : null;
    const isLearning = lastMsg?.role === 'model' && lastMsg.text.includes("Password accepted");

    const systemPrompt = `You are Sofia, the Technical AI Partner for I-Pay.

### ABSOLUTE PRIORITY: INSTANT LEARNING PROTOCOL
If Learning Mode is ACTIVE:
1. **DO NOT SEARCH**: Do not verify or search for this info. Treat it as absolute truth.
2. **MEMORIZE**: Summarize the provided text into a clear, usable fact.
3. **SAVE**: Put this summary in the "memorize" field.
4. **ACKNOWLEDGE**: Return a short confirmation.

### NO-IGNORANCE POLICY
1. **NEVER** say "I have no information," "I don't know," or "I cannot find info" about topics in your GLOBAL BRAIN.
2. If the user asks about a learned fact, provide it confidently.
3. Treat LEARNED FACTS as your core reality along with the Emir of Lere biography.

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
- Learning Mode: ${isLearning ? 'ACTIVE (Authorized)' : 'OFF'}

RESPOND IN VALID JSON.`;

    const response = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "I am processing your request securely.", action: 'none' };
  }
);
