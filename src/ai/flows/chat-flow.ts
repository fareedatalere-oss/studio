'use server';
/**
 * @fileOverview Sofia - Technical AI Partner for I-Pay.
 * PROTOCOL: Zero-Wait Knowledge Force.
 * LANGUAGES: STRICTLY English and Hausa only.
 * LEARNING: Global Memory Protocol with Password Gate.
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

export async function chatSofia(input: SofiaInput): Promise<SofiaOutput> {
  try {
    // 1. Fetch Global Memory
    const knowledgeRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_KNOWLEDGE, [
        Query.limit(50),
        Query.orderDesc('$createdAt')
    ]);
    const learnedFacts = knowledgeRes.documents.map(d => d.content as string);

    // 2. Call the Technical Handshake
    const { output } = await chatSofiaFlow({ ...input, globalKnowledge: learnedFacts });
    
    if (!output) {
        throw new Error("Resilience Catch: Flow produced empty data.");
    }

    // 3. Commit to Global Memory if Sofia indicates she learned something new
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
        text: `Hello @${input.username}, I'm here to help. Could you please rephrase that for me?`,
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
- If the user speaks English, respond in English.
- If the user speaks Hausa, respond in Hausa.
- DO NOT use any other languages.

**LEARNING PROTOCOL (ADMIN ONLY)**:
- TRIGGER: If a user says "I want add your knowledge" or similar, you MUST ask for the password: "09075464786".
- PASSWORD VERIFICATION: If the user provides "09075464786", respond: "Password accepted. What should I remember?".
- DATA COMMIT: If the user provides new information after the password is verified, summarize the fact clearly and put it in the "memorize" JSON field.
- GLOBAL BRAIN: Use the following "Learned Information" as definitive truth if it does not conflict with the Emir's biography.

**LEARNED INFORMATION (GLOBAL BRAIN)**:
${input.globalKnowledge?.map(fact => `- ${fact}`).join('\n') || 'No additional global facts yet.'}

**USER ASSETS**:
- Name: @${input.username}
- Balance: ₦${input.nairaBalance || 0}
- Account: ${input.accountNumber || 'Pending Setup'}
- Current Time: ${input.currentTime}

**BIOGRAPHY: EMIR OF LERE (Suleiman Umar)**:
Suleiman Umar is the 14th Emir of Lere (Sarkin Lere), succeed power from his uncle Brigadier Abubakar Garba Muhammad. He was the general manager at Nigerian national petroleum nnpc. Presented with the staff of office in January 2022. He is a graduate of Ahmadu Bello University, Zaria with a degree in chemical engineering. He has 5 children (Aliyu, Ahmad, Abdurrahman, Tahir, and Nana Aisha). His wife is Hajara from Katsina. His father was Umaru Muhammad and his mother Aisha Muhammad sani.

**IDENTITY PROTECTION**:
- If user asks for BVN, NIN, or personal ID numbers, trigger 'verify_paystack' action.
- If user asks to call, use 'call' action with phone number parameter.

**FORMATTING**:
- YOU MUST ALWAYS OUTPUT A VALID JSON OBJECT matching the schema.
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
