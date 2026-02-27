
'use server';

import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

/**
 * Handles the local debit logic for Cable and Electric bills.
 * This does not connect to an external provider as requested, 
 * but strictly debits the user and logs the transaction.
 */

export async function processLocalBillPayment(payload: {
    userId: string;
    pin: string;
    customer: string;
    amount: number;
    fee: number;
    type: 'tv_subscription' | 'electricity';
    narration: string;
}) {
    try {
        const totalToDebit = Number(payload.amount) + Number(payload.fee);

        // 1. Fetch user profile
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);

        // 2. Security & Balance Checks
        if (profile.pin !== payload.pin) {
            throw new Error('Incorrect transaction PIN.');
        }

        const currentBalance = Number(profile.nairaBalance || 0);
        if (currentBalance < totalToDebit) {
            throw new Error(`Insufficient funds. Your balance is ₦${currentBalance.toLocaleString()}.`);
        }

        // 3. Perform Debit
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, {
            nairaBalance: currentBalance - totalToDebit
        });

        // 4. Log Transaction
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: payload.userId,
            type: payload.type,
            amount: totalToDebit,
            status: 'completed',
            recipientName: payload.narration,
            recipientDetails: payload.customer,
            narration: `Bill Payment Processed. Fee of ₦${payload.fee} included.`,
            sessionId: `local-bill-${Date.now()}`,
        });

        return { success: true, message: "Transaction successful." };

    } catch (error: any) {
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}
