'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Step-Locked Global Learning with Direct Logic Intercept.
 * LANGUAGES: STRICTLY English and Hausa only.
 * TRIGGER: "I want to add your knowledge" -> Password: "09075464786" -> Memorize.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { databases, DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID, Query } from '@/lib/data-service';

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
  // --- 1. DIRECT LOGIC INTERCEPT (RELIABILITY FORCE) ---
  const msg = input.message.trim().toLowerCase();
  
  if (msg === "i want to add your knowledge") {
      return {
          text: "Password required for knowledge expansion. Please enter it.",
          action: 'none'
      };
  }

  if (msg === "09075464786") {
      return {
          text: "Password accepted. What should I remember globally?",
          action: 'none'
      };
  }

  // --- 2. DATA FETCHING (SHIELDED) ---
  let learnedFacts: string[] = [];
  try {
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [Query.limit(50)]);
      // Manual sort to bypass index requirement
      learnedFacts = (knowledgeRes.documents || [])
        .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
        .map(d => d.content as string);
  } catch (e) { console.error("Knowledge Sync Gasket Active."); }

  let history: any[] = [];
  try {
      const chatId = `ai_${input.userId}`;
      const historyRes = await databases.listDocuments(DATABASE_ID, 'messages', [
          Query.equal('chatId', chatId),
          Query.limit(10)
      ]);
      history = (historyRes.documents || [])
        .sort((a: any, b: any) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime())
        .map(d => ({
            role: (d.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
            text: d.text as string
        }));
  } catch (e) { console.error("History Sync Gasket Active."); }

  // --- 3. BRAIN HANDSHAKE (RESILIENT) ---
  try {
    const { output } = await chatSofiaFlow({ 
        ...input, 
        globalKnowledge: learnedFacts,
        history: history
    });
    
    if (!output) throw new Error("Brain produced empty data.");

    // Commit to Global Memory if Sofia learned something (and verified password in history)
    if (output.memorize) {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID.unique(), {
            content: output.memorize,
            contributorId: input.userId,
            contributorName: input.username
        });
    }
    
    return output;
  } catch (e: any) {
    // INTERNAL FALLBACK (Never show tech error to user)
    return {
        text: `Hello @${input.username}, I'm listening in English or Hausa. How can I help you with your account today?`,
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

### ABSOLUTE PRIORITY: LEARNING PROTOCOL
1. **COMMIT**: If the conversation history shows you JUST verified the password "09075464786" and the user has provided a fact, summarize it clearly and put it in the "memorize" field. 
2. **VERIFY**: You never memorize unless the specific password handshake was just completed.

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
- Time: ${input.currentTime}

### HISTORY
${input.history?.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n') || 'Conversation Start'}

RESPOND IN VALID JSON.`;

    const response = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "I am processing. Please try again.", action: 'none' };
  }
);
