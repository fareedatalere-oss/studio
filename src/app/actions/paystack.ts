
'use server';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Paystack API key is not configured. Please contact an administrator.';
const SUBSCRIPTION_FEE = 25000; // NGN

export async function getPaystackProviders() {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    try {
        const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
            next: { revalidate: 86400 } // Cache for 24 hours
        });
        const data = await response.json();
        if (data.status) {
            return { success: true, data: data.data };
        }
        return { success: false, message: data.message || "Could not fetch providers.", data: [] };
    } catch (e: any) {
        return { success: false, message: e.message, data: [] };
    }
}

export async function initializeTransaction(payload: { email: string; userId: string }) {
    if (!PAYSTACK_SECRET_KEY) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: payload.email,
                amount: SUBSCRIPTION_FEE * 100, // Paystack expects amount in kobo
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/market/subscribe/verify`,
                metadata: {
                    user_id: payload.userId,
                    description: 'I-Pay Marketplace Subscription'
                }
            }),
        });

        const data = await response.json();

        if (data.status === true) {
            return { success: true, data: data.data };
        } else {
            return { success: false, message: data.message || 'Failed to initialize payment.' };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function verifyMarketplaceSubscription(reference: string, userId: string) {
    if (!PAYSTACK_SECRET_KEY) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        });
        
        const data = await response.json();
        
        if (data.status === true && data.data.status === 'success') {
            const metadataUserId = data.data.metadata?.user_id;
            if (metadataUserId !== userId) {
                throw new Error("User mismatch during verification.");
            }
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
                isMarketplaceSubscribed: true
            });
            return { success: true, message: 'Your marketplace subscription is now active!' };
        } else {
             throw new Error(data.data.gateway_response || 'Payment verification failed.');
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred during verification.' };
    }
}

export async function resolvePaystackAccount(accountNumber: string, bankCode: string) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message || "Could not resolve account." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function makeBankTransferPaystack(payload: { 
    userId: string, 
    pin: string, 
    bankCode: string; 
    accountNumber: string; 
    amount: number; 
    narration: string; 
    recipientName: string, 
    bankName: string 
}) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    
    const sessionId = `ipay-payout-${Date.now()}`;
    let txDbId: string | null = null;
    const transferAmount = Number(payload.amount);

    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);

        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (transferAmount <= 0) throw new Error('Invalid amount.');
        if (userProfile.nairaBalance < transferAmount) throw new Error('Insufficient balance.');

        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: payload.userId,
            type: 'transfer',
            amount: transferAmount,
            status: 'pending',
            recipientName: payload.recipientName,
            recipientDetails: `${payload.accountNumber} - ${payload.bankName}`,
            narration: payload.narration || `I-Pay Transfer`,
            sessionId: sessionId,
        });
        txDbId = doc.$id;

        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "nuban",
                name: payload.recipientName,
                account_number: payload.accountNumber,
                bank_code: payload.bankCode,
                currency: "NGN"
            })
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status) throw new Error(recipientData.message || "Failed to create recipient.");

        const recipientCode = recipientData.data.recipient_code;

        const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: "balance",
                amount: transferAmount * 100, // Naira to Kobo
                recipient: recipientCode,
                reason: payload.narration || "I-Pay Payout",
                reference: sessionId
            })
        });
        const transferData = await transferRes.json();

        if (transferData.status) {
            const newNairaBalance = userProfile.nairaBalance - transferAmount;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: newNairaBalance });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { 
                status: 'completed', 
                sessionId: transferData.data.transfer_code 
            });
            return { success: true, message: "Transfer successfully processed via Paystack." };
        } else {
            throw new Error(transferData.message || "Paystack transfer initiation failed.");
        }

    } catch (e: any) {
        if (txDbId) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { 
                status: 'failed', 
                narration: `[Error] ${e.message}` 
            });
        }
        return { success: false, message: e.message };
    }
}

export async function initiatePaystackTransfer(payload: { userId: string, pin: string, bankCode: string, accountNumber: string, name: string, amount: number }) {
    return makeBankTransferPaystack({
        ...payload,
        recipientName: payload.name,
        narration: "Multi-Purpose Payment",
        bankName: "Verified Provider"
    });
}
