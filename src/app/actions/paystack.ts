'use server';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Paystack API key is not configured. Please contact an administrator.';
const SUBSCRIPTION_FEE = 25000; // NGN

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
            return { success: true, data: data.data }; // data contains authorization_url and reference
        } else {
            console.error("Paystack Initialization Error:", data);
            return { success: false, message: data.message || 'Failed to initialize payment.' };
        }
    } catch (error: any) {
        console.error("Paystack Connection Error:", error);
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
            const paidAmount = data.data.amount / 100;
            const metadataUserId = data.data.metadata?.user_id;

            if (metadataUserId !== userId) {
                throw new Error("User mismatch during verification.");
            }

            if (paidAmount < SUBSCRIPTION_FEE) {
                throw new Error(`Payment amount is incorrect. Expected ₦${SUBSCRIPTION_FEE}, got ₦${paidAmount}.`);
            }

            // Update user profile to grant subscription access
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
                isMarketplaceSubscribed: true
            });

            return { success: true, message: 'Your marketplace subscription is now active!' };
        } else {
             throw new Error(data.data.gateway_response || 'Payment verification failed.');
        }
    } catch (error: any) {
        console.error("Paystack Verification Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred during payment verification.' };
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

export async function initiatePaystackTransfer(payload: { accountNumber: string, bankCode: string, name: string, amount: number }) {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        // 1. Create Recipient
        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "nuban",
                name: payload.name,
                account_number: payload.accountNumber,
                bank_code: payload.bankCode,
                currency: "NGN"
            })
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status) throw new Error(recipientData.message || "Failed to create recipient.");

        const recipientCode = recipientData.data.recipient_code;

        // 2. Initiate Transfer
        const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: "balance",
                amount: payload.amount * 100, // Naira to Kobo
                recipient: recipientCode,
                reason: "I-Pay Paystack Payout"
            })
        });
        const transferData = await transferRes.json();
        if (transferData.status) return { success: true, message: "Transfer initiated successfully." };
        return { success: false, message: transferData.message || "Transfer failed." };

    } catch (e: any) {
        return { success: false, message: e.message };
    }
}