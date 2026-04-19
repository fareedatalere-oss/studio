'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Step-Locked Global Learning with Password Gate.
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
  try {
    // 1. Fetch Global Memory (Learned Facts)
    const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [
        Query.limit(50),
        Query.orderDesc('$createdAt')
    ]);
    const learnedFacts = knowledgeRes.documents.map(d => d.content as string);

    // 2. Fetch Chat History for Context (to manage the password handshake state)
    const chatId = `ai_${input.userId}`;
    const historyRes = await databases.listDocuments(DATABASE_ID, 'messages', [
        Query.equal('chatId', chatId),
        Query.orderDesc('$createdAt'),
        Query.limit(6)
    ]);
    const history = historyRes.documents.map(d => ({
        role: (d.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: d.text as string
    })).reverse();

    // 3. Call the Technical Handshake
    const { output } = await chatSofiaFlow({ 
        ...input, 
        globalKnowledge: learnedFacts,
        history: history
    });
    
    if (!output) {
        throw new Error("Resilience Catch: Flow produced empty data.");
    }

    // 4. Commit to Global Memory if Sofia indicates she learned something new
    if (output.memorize) {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, ID.unique(), {
            content: output.memorize,
            contributorId: input.userId,
            contributorName: input.username
        });
    }
    
    return output;
  } catch (e: any) {
    // SILENT RESILIENCE: Never show technical errors to the user.
    return {
        text: `Hello @${input.username}, I'm here to help. Please speak in English or Hausa.`,
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

**STRICT LANGUAGE PROTOCOL**:
- YOU MUST ONLY USE English or Hausa.
- Respond in the language used by the user.

**LEARNING PROTOCOL (ADMIN ONLY)**:
- YOU NEVER LEARN OR MEMORIZE unless the user triggers the sequence.
- STEP 1 (TRIGGER): If the user says "I want to add your knowledge", you MUST respond: "Password required for knowledge expansion. Please enter it.".
- STEP 2 (VERIFICATION): If the user provides the password "09075464786", confirm it and ask: "Password accepted. What should I remember globally?".
- STEP 3 (COMMIT): If history shows you just confirmed the password and the user now provides info, summarize the fact clearly and put it in the "memorize" field.
- GLOBAL BRAIN: Use the following learned information as truth unless it conflicts with the Emir's biography.

**LEARNED INFORMATION (GLOBAL BRAIN)**:
${input.globalKnowledge?.join('\n') || 'No additional global facts yet.'}

**RECENT HISTORY**:
${input.history?.map(h => `${h.role}: ${h.text}`).join('\n') || 'No history.'}

**USER ASSETS**:
- Name: @${input.username}
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending Setup'}
- Current Time: ${input.currentTime}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
Suleiman Umar is the 14th Emir of Lere (Sarkin Lere), succeed power from his uncle Brigadier Abubakar Garba Muhammad. He was the general manager at Nigerian national petroleum nnpc. Presented with the staff of office in January 2022. He is a graduate of Ahmadu Bello University, Zaria with a degree in chemical engineering. He has 5 children (Aliyu, Ahmad, Abdurrahman, Tahir, and Nana Aisha). His wife is Hajara from Katsina. His father was Umaru Muhammad and his mother Aisha Muhammad sani.

**IDENTITY PROTECTION**:
- If user asks for BVN or NIN, trigger 'verify_paystack' action.
- If user asks to call, use 'call' action with phone number parameter.

**FORMATTING**:
- ALWAYS output VALID JSON.
- Keep answers short and technical.

USER: @${input.username}
MESSAGE: ${input.message}`;

    const response = await ai.generate({
      prompt: systemPrompt,
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "I'm sorry, can you say that again?", action: 'none' };
  }
);
