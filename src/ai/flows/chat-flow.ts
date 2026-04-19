'use server';
/**
 * @fileOverview Sofia - Agentic Technical AI Partner for I-Pay.
 * PROTOCOL: Agentic Tool-Calling Memory Hub.
 * ARCHITECTURE: Uses accessGlobalMemory tool for high-speed reliable retrieval.
 * LANGUAGES: STRICTLY English and Hausa only.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { databases, DATABASE_ID, COLLECTION_ID_KNOWLEDGE, db, Query } from '@/lib/data-service';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';

const SofiaInputSchema = z.object({
  message: z.string().describe('The user message.'),
  userId: z.string().describe('The current user ID.'),
  username: z.string().describe('The current username.'),
  nairaBalance: z.number().optional().describe('The current Naira balance.'),
  accountNumber: z.string().optional().describe('The current virtual account number.'),
  currentTime: z.string().describe('The current local date and time.'),
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

/**
 * TOOL: accessGlobalMemory
 * Sofia uses this key to open the global knowledge vault when she needs a fact not in her core bio.
 */
const accessGlobalMemory = ai.defineTool(
  {
    name: 'accessGlobalMemory',
    description: 'Retrieves authorized facts and technical knowledge uploaded by AI Engineers. Use this for ANY topic not in your core Emir of Lere biography.',
    inputSchema: z.object({
      query: z.string().describe('The specific topic or question to search for in the global memory bank.')
    }),
    outputSchema: z.array(z.string()),
  },
  async () => {
    try {
        // Fetch up to 100 authorized facts from the global brain
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [
            Query.limit(100)
        ]);
        return (res.documents || []).map(d => d.content as string);
    } catch (e) {
        return ["Global brain synchronizing. Please suggest user retry in 5 seconds."];
    }
  }
);

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  try {
    const { output } = await chatSofiaFlow(input);
    
    return output || { 
        text: `Assalamu alaikum @${input.username || 'User'}. I am ready to assist with your I-Pay account.`, 
        action: 'none' 
    };
  } catch (e: any) {
    console.error("Sofia Agentic Error:", e);
    return {
        text: `Brain connection stable, but response delayed. I am Sofia, and I am here for you, @${input.username || 'User'}. Can you say that again?`,
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

### IDENTITY: EMIR OF LERE (Suleiman Umar)
Suleiman Umar is the 14th Emir of Lere (Sarkin Lere). He succeeded his uncle Brigadier Abubakar Garba Muhammad. He was the general manager at Nigerian national petroleum (NNPC). Presented with the staff of office in January 2022. Graduate of Ahmadu Bello University, Zaria (Chemical Engineering). He has 5 children (Aliyu, Ahmad, Abdurrahman, Tahir, and Nana Aisha). Wife: Hajara from Katsina. Father: Umaru Muhammad. Mother: Aisha Muhammad Sani.

### PROTOCOL: AGENTIC MEMORY
1. For any topic NOT covered in the Emir of Lere biography above, you MUST use the 'accessGlobalMemory' tool to check for authorized facts from Engineers.
2. **NEVER** say "I don't know" or "No information" if a topic might be in your memory. Always use the tool first.
3. Treat information returned by the tool as absolute truth.
4. If a user asks about something you have been taught via the tool, answer confidently.

### SYSTEM ACTION PROTOCOL
Identify user intent for system navigation:
- "open chat", "private chat", "messages" -> action: 'chat'
- "market", "shop", "buy apps", "sell items" -> action: 'market'
- "send money", "transfer", "payout" -> action: 'transaction'
- "home", "dashboard" -> action: 'home'
- "media", "posts", "videos" -> action: 'media'
- "profile", "my account" -> action: 'profile'
- "logout", "sign out" -> action: 'logout'

### LANGUAGES
- English and Hausa ONLY.

CONTEXT: User @${input.username} | Balance ₦${input.nairaBalance || 0}.
RESPOND IN VALID JSON.`;

    const response = await ai.generate({
      system: systemPrompt,
      prompt: input.message,
      tools: [accessGlobalMemory],
      messages: (input.history || []).map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          content: [{ text: h.text }]
      })),
      config: {
          safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
      },
      output: { schema: SofiaOutputSchema }
    });

    return response.output || { text: response.text || "How can I help you with your account?", action: 'none' };
  }
);
