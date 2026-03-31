'use server';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Configuration error. Please contact support.';

export async function getPaystackBanks() {
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

export async function resolvePaystackAccount(accountNumber: string, bankCode: string) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message || "Could not resolve account name." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function initiatePaystackTransfer(payload: { userId: string, pin: string, bankCode: string, accountNumber: string, name: string, amount: number, bankName: string, narration: string }) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };

    const FEE = 30; // Flat 30 Naira fee for outgoing transfers
    const amt = Number(payload.amount);
    const totalDebit = amt + FEE;

    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (userProfile.nairaBalance < totalDebit) throw new Error(`Insufficient balance. Required: ₦${totalDebit.toLocaleString()}`);

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
            body: JSON.stringify({ source: "balance", amount: amt * 100, recipient: recipientData.data.recipient_code, reason: payload.narration || payload.name, reference: `ipay-out-${Date.now()}` })
        });
        const transferData = await transferRes.json();

        if (transferData.status) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: userProfile.nairaBalance - totalDebit });
            const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: 'transfer',
                amount: amt,
                status: 'completed',
                recipientName: payload.name,
                recipientDetails: `${payload.accountNumber} - ${payload.bankName}`,
                narration: `Service charge of ₦${FEE} applied.`,
                sessionId: transferData.data.transfer_code || `tx-${Date.now()}`,
            });
            return { success: true, message: "Transfer successful.", transactionId: doc.$id };
        } else {
            // Log failure
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: 'transfer',
                amount: amt,
                status: 'failed',
                recipientName: payload.name,
                recipientDetails: `${payload.accountNumber} - ${payload.bankName}`,
                narration: transferData.message,
                sessionId: `fail-${Date.now()}`,
            });
            throw new Error(transferData.message);
        }
    } catch (e: any) {
        return { success: false, message: e.message };
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
                amount: payload.amount * 100,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
                channels: ['bank_transfer', 'card'],
                metadata: { user_id: payload.userId, type: 'deposit' }
            }),
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}