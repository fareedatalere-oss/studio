
'use server';
import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

const FLUTTERWAVE_API_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Your API key is not configured. Please contact an administrator.';
const REQUEST_TIMEOUT = 20000; // 20 seconds

export async function getBankList() {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
            },
            signal: controller.signal,
            cache: 'force-cache'
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data, message: 'Banks fetched successfully.' };
        } else {
            return { success: false, message: data.message || 'Failed to fetch bank list.', data: [] };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        return { success: false, message: error.message || 'An unexpected error occurred.', data: [] };
    }
}

export async function syncVirtualAccountPayments(userId: string, userEmail?: string) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: "API key is not configured correctly." };
    }

    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        const email = userEmail || profile.email;
        
        if (!email) {
            return { success: false, message: "No email associated with this account." };
        }

        const response = await fetch(`https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(email)}&status=successful`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            cache: 'no-store',
        });
        
        const data = await response.json();

        if (data.status !== 'success') {
            return { success: false, message: data.message || "Could not reach payment service." };
        }

        const remoteTransactions = data.data || [];
        let totalNewAmount = 0;
        let foundNew = false;

        for (const tx of remoteTransactions) {
            const txId = tx.id.toString();
            
            // Deduplicate: Check if we already processed this ID
            const existingRecords = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                Query.equal('sessionId', txId),
                Query.limit(1)
            ]);

            if (existingRecords.total === 0) {
                totalNewAmount += Number(tx.amount);
                foundNew = true;

                // Create record without the problematic 'createdAt' attribute
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                    userId: userId,
                    type: 'deposit',
                    amount: Number(tx.amount),
                    status: 'completed',
                    recipientName: 'Wallet Credit',
                    recipientDetails: `Deposit: ${tx.payment_type || 'Transfer'}`,
                    narration: tx.narration || `Ref: ${tx.tx_ref}`,
                    sessionId: txId,
                });
            }
        }

        if (foundNew) {
            const currentBalance = Number(profile.nairaBalance || 0);
            const newBalance = currentBalance + totalNewAmount;
            
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
                nairaBalance: newBalance
            });
            return { success: true, amountAdded: totalNewAmount, message: `Successfully updated! Added ₦${totalNewAmount.toLocaleString()} to balance.` };
        }

        return { success: true, amountAdded: 0, message: "Your balance is accurate and up to date." };

    } catch (error: any) {
        console.error("Sync Error:", error);
        return { success: false, message: error.message || "An error occurred during sync." };
    }
}

export async function generateVirtualAccount(payload: any) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.flutterwave.com/v3/virtual-account-numbers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...payload,
                is_permanent: true,
                tx_ref: `v-acc-${Date.now()}`
            }),
        });
        const data = await response.json();
        if (data.status === 'success') return { success: true, data: data.data };
        return { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function makeBillPayment(payload: any) {
    // Legacy support for school payments
    return { success: false, message: "Service under maintenance." };
}

export async function getUtilityProviders(type: string) { return { success: false, data: [] }; }
export async function getUtilityPlans(billerCode: string) { return { success: false, data: [] }; }
export async function getCardVerificationLink(payload: any) { return { success: false, message: "Feature disabled." }; }
export async function verifyCardPayment(transactionId: string, userId: string) { return { success: false }; }
export async function chargeTokenizedCard(payload: any) { return { success: false }; }
