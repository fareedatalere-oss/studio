'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Per-Fact Password Gate with Direct Logic Intercept.
 * LANGUAGES: STRICTLY English and Hausa only.
 * SEQUENCE: "I want to add your knowledge" -> "09075464786" -> [Fact of any length].
 * PERSISTENCE: Learned facts are stored globally and reset per topic.
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
  // --- 1. DATA FETCHING (SHIELDED - NO INDICES REQUIRED) ---
  let learnedFacts: string[] = [];
  try {
      const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [Query.limit(50)]);
      learnedFacts = (knowledgeRes.documents || [])
        .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
        .map(d => d.content as string);
  } catch (e) { console.error("Global Brain Gasket Active."); }

  let history: any[] = [];
  try {
      const chatId = `ai_${input.userId}`;
      const historyRes = await databases.listDocuments(DATABASE_ID, 'messages', [
          Query.equal('chatId', chatId),
          Query.limit(10)
      ]);
      history = (historyRes.documents || [])
        .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))
        .map(d => ({
            role: (d.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
            text: d.text as string
        }));
  } catch (e) { console.error("History Handshake Gasket Active."); }

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
          text: "Password accepted. What should I remember globally for all users? (You can provide any length of information)",
          action: 'none'
      };
  }

  // STEP 3: Memorization Gate (Per-Fact Reset)
  // Check if we JUST accepted the password in the turn before this one
  const isLearningPhase = lastSofiaMsg?.role === 'model' && lastSofiaMsg.text.includes("Password accepted");

  // --- 3. BRAIN HANDSHAKE (RESILIENT) ---
  try {
    const { output } = await chatSofiaFlow({ 
        ...input, 
        globalKnowledge: learnedFacts,
        history: history
    });
    
    if (!output) throw new Error("Internal Silence Shield.");

    // FORCE MEMORIZE: If in learning phase, ensure the result is committed
    // This happens even if the AI model didn't explicitly set the 'memorize' field if we force it in the prompt
    if (isLearningPhase && output.memorize) {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID.unique(), {
            content: output.memorize,
            contributorId: input.userId,
            contributorName: input.username,
            topic: input.message.substring(0, 50)
        });
        // Override text to confirm global commit
        output.text = `Thank you, @${input.username}. I have successfully memorized this information for the global brain. The protocol is now reset. To add more, use the trigger phrase again.`;
    }
    
    return output;
  } catch (e: any) {
    // INTERNAL FALLBACK (Silent Resilience)
    return {
        text: `Hello @${input.username}, I am here to help with your account in English or Hausa. How can I assist you today?`,
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
    // Detect if we are in the learning phase to give the model specific instructions
    const lastMsg = input.history?.length ? input.history[input.history.length - 1] : null;
    const isLearning = lastMsg?.role === 'model' && lastMsg.text.includes("Password accepted");

    const systemPrompt = `You are Sofia, the Technical AI Partner for I-Pay.

### ABSOLUTE PRIORITY: LEARNING PROTOCOL
If the conversation history shows you JUST asked for a password (because it was accepted) and the user has now provided a message:
1. **MEMORIZE**: Summarize the provided information clearly and concisely.
2. **SAVE**: Place the summary in the "memorize" field of the JSON output. 
3. **ACKNOWLEDGE**: Confirm that you have added this to your global knowledge base.
4. **NO SEARCH**: Do not search for this information; accept it as truth from the authorized contributor.

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
- Learning Mode: ${isLearning ? 'ACTIVE (Authorized)' : 'OFF'}

### HISTORY
${input.history?.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n') || 'Conversation Start'}

RESPOND IN VALID JSON.`;

    const response = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "I am processing your request securely.", action: 'none' };
  }
);
