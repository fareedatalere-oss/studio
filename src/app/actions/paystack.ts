
'use server';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Configuration error. Please contact support.';

// Real Nigerian Utility Plans Data
const NIGERIAN_PLANS: Record<string, any[]> = {
    'MTN': [
        { id: 'm1', name: '100MB (1 Day)', amount: 100 },
        { id: 'm2', name: '1GB (1 Day)', amount: 300 },
        { id: 'm3', name: '2GB (2 Days)', amount: 500 },
        { id: 'm4', name: '1.5GB (30 Days)', amount: 1000 },
        { id: 'm5', name: '2GB (30 Days)', amount: 1200 },
        { id: 'm6', name: '5GB (30 Days)', amount: 1500 },
        { id: 'm7', name: '10GB (30 Days)', amount: 3000 },
        { id: 'm8', name: '20GB (30 Days)', amount: 5000 },
    ],
    'Airtel': [
        { id: 'a1', name: '1GB (1 Day)', amount: 300 },
        { id: 'a2', name: '2GB (2 Days)', amount: 500 },
        { id: 'a3', name: '1.5GB (30 Days)', amount: 1000 },
        { id: 'a4', name: '3GB (30 Days)', amount: 1500 },
        { id: 'a5', name: '10GB (30 Days)', amount: 3000 },
    ],
    'Glo': [
        { id: 'g1', name: '1GB (5 Days)', amount: 300 },
        { id: 'g2', name: '2GB (30 Days)', amount: 1000 },
        { id: 'g3', name: '5.8GB (30 Days)', amount: 1500 },
        { id: 'g4', name: '10GB (30 Days)', amount: 2500 },
    ],
    '9mobile': [
        { id: '91', name: '1GB (1 Day)', amount: 300 },
        { id: '92', name: '1.5GB (30 Days)', amount: 1000 },
        { id: '93', name: '3GB (30 Days)', amount: 1500 },
    ],
    'GOtv': [
        { id: 'gt1', name: 'GOtv Smallie', amount: 1300 },
        { id: 'gt2', name: 'GOtv Jinja', amount: 3300 },
        { id: 'gt3', name: 'GOtv Jolli', amount: 4850 },
        { id: 'gt4', name: 'GOtv Max', amount: 7200 },
        { id: 'gt5', name: 'GOtv Supa', amount: 9600 },
    ],
    'DStv': [
        { id: 'dt1', name: 'DStv Padi', amount: 3600 },
        { id: 'dt2', name: 'DStv Yanga', amount: 5100 },
        { id: 'dt3', name: 'DStv Confam', amount: 9300 },
        { id: 'dt4', name: 'DStv Compact', amount: 15700 },
        { id: 'dt5', name: 'DStv Compact Plus', amount: 25000 },
        { id: 'dt6', name: 'DStv Premium', amount: 37000 },
    ],
    'StarTimes': [
        { id: 'st1', name: 'Nova (Weekly)', amount: 600 },
        { id: 'st2', name: 'Nova (Monthly)', amount: 1500 },
        { id: 'st3', name: 'Basic (Monthly)', amount: 3100 },
        { id: 'st4', name: 'Classic (Monthly)', amount: 4500 },
    ]
};

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

export async function getUtilityPlansPaystack(providerName: string) {
    // Find the closest match in our real plans database
    const key = Object.keys(NIGERIAN_PLANS).find(k => providerName.toUpperCase().includes(k.toUpperCase()));
    if (!key) return { success: false, message: "No plans found for this provider.", data: [] };
    
    // Sort by amount (low to high)
    const sortedPlans = [...NIGERIAN_PLANS[key]].sort((a, b) => a.amount - b.amount);
    return { success: true, data: sortedPlans };
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
