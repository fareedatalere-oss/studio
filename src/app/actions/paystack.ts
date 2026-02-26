
'use server';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Configuration error. Please contact support.';

export async function getPaystackProviders() {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    try {
        const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
            next: { revalidate: 86400 }
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message || "Request failed.", data: [] };
    } catch (e: any) {
        return { success: false, message: e.message, data: [] };
    }
}

export async function getPaystackBillers() {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    try {
        const response = await fetch('https://api.paystack.co/billpayment', {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
            next: { revalidate: 3600 }
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message || "Could not fetch billers.", data: [] };
    } catch (e: any) {
        return { success: false, message: e.message, data: [] };
    }
}

export async function initiatePaystackBillPayment(payload: { 
    userId: string, 
    pin: string, 
    customer: string, 
    amount: number, 
    type: string, 
    description: string 
}) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    
    const sessionId = `ipay-bill-${Date.now()}`;
    let txDbId: string | null = null;

    try {
        // 1. Verify User and Balance
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (userProfile.nairaBalance < payload.amount) throw new Error('Insufficient balance.');

        // 2. Create Transaction Log
        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: payload.userId,
            type: 'product_purchase', // mapping to a spending type for ledger
            amount: payload.amount,
            status: 'pending',
            recipientName: payload.description,
            recipientDetails: payload.customer,
            narration: payload.description,
            sessionId: sessionId,
        });
        txDbId = doc.$id;

        // 3. Send Real Bill Payment Request to Paystack
        const response = await fetch('https://api.paystack.co/billpayment', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer: payload.customer,
                amount: payload.amount * 100, // Paystack expects kobo
                type: payload.type, 
                reference: sessionId
            })
        });

        const data = await response.json();

        if (data.status) {
            // 4. Update Balances and Status
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { 
                nairaBalance: userProfile.nairaBalance - payload.amount 
            });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { 
                status: 'completed' 
            });
            return { success: true, message: "Transaction successful." };
        } else {
            throw new Error(data.message || "Paystack declined the transaction.");
        }

    } catch (e: any) {
        if (txDbId) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { 
                status: 'failed', 
                narration: `Error: ${e.message}` 
            });
        }
        return { success: false, message: e.message };
    }
}

export async function initializeTransaction(payload: { email: string; userId: string }) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: payload.email,
                amount: 25000 * 100,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/market/subscribe/verify`,
                metadata: { user_id: payload.userId }
            }),
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function initializeDeposit(payload: { email: string; userId: string; amount: number }) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: payload.email,
                amount: payload.amount * 100, // kobo
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
                channels: ['bank_transfer'],
                metadata: { 
                    user_id: payload.userId,
                    type: 'deposit'
                }
            }),
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function verifyMarketplaceSubscription(reference: string, userId: string) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
        });
        const data = await response.json();
        if (data.status && data.data.status === 'success') {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { isMarketplaceSubscribed: true });
            return { success: true, message: 'Subscription active!' };
        }
        return { success: false, message: 'Verification failed.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function initiatePaystackTransfer(payload: { userId: string, pin: string, bankCode: string, accountNumber: string, name: string, amount: number }) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    const sessionId = `ipay-out-${Date.now()}`;
    let txDbId: string | null = null;

    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (userProfile.pin !== payload.pin) throw new Error('Incorrect PIN.');
        if (userProfile.nairaBalance < payload.amount) throw new Error('Insufficient balance.');

        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: payload.userId,
            type: 'transfer',
            amount: payload.amount,
            status: 'pending',
            recipientName: payload.name,
            recipientDetails: payload.accountNumber,
            narration: `Payment for ${payload.name}`,
            sessionId: sessionId,
        });
        txDbId = doc.$id;

        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "nuban", name: payload.name, account_number: payload.accountNumber, bank_code: payload.bankCode, currency: "NGN" })
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status) throw new Error(recipientData.message);

        const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: "balance", amount: payload.amount * 100, recipient: recipientData.data.recipient_code, reason: payload.name, reference: sessionId })
        });
        const transferData = await transferRes.json();

        if (transferData.status) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: userProfile.nairaBalance - payload.amount });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { status: 'completed' });
            return { success: true, message: "Payment processed." };
        } else {
            throw new Error(transferData.message);
        }
    } catch (e: any) {
        if (txDbId) await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { status: 'failed', narration: `Error: ${e.message}` });
        return { success: false, message: e.message };
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
        return { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
