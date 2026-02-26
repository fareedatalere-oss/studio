'use server';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

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

export async function getPaystackBankList() {
    if (!PAYSTACK_SECRET_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    try {
        const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
            next: { revalidate: 86400 } // Cache for 24 hours
        });
        const data = await response.json();
        if (data.status) return { success: true, data: data.data };
        return { success: false, message: data.message || "Could not fetch bank list.", data: [] };
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
        if (transferAmount <= 0) throw new Error('Invalid transfer amount.');
        if (userProfile.nairaBalance < transferAmount) throw new Error('Insufficient balance.');

        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: payload.userId,
            type: 'transfer',
            amount: transferAmount,
            status: 'pending',
            recipientName: payload.recipientName,
            recipientDetails: `${payload.accountNumber} - ${payload.bankName}`,
            narration: payload.narration || `I-Pay Transfer to ${payload.recipientName}`,
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
        if (!recipientData.status) throw new Error(recipientData.message || "Failed to create recipient on Paystack.");

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
                reason: payload.narration || "I-Pay Transfer",
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
            return { success: true, message: "Transfer successfully initiated." };
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
        narration: "Paystack Payment",
        bankName: "Provider Bank"
    });
}

export async function getPaystackMultiPurposeBillers() {
    // Simulated curated list of Nigerian billers searchable via Paystack
    return [
        { id: '1', category: 'Electricity', name: 'EKEDC (Eko Electricity)', code: '044', accountNumber: '1234567890' },
        { id: '2', category: 'Electricity', name: 'IKEDC (Ikeja Electric)', code: '011', accountNumber: '0987654321' },
        { id: '3', category: 'Water', name: 'Lagos Water Corporation', code: '058', accountNumber: '1122334455' },
        { id: '4', category: 'School Fees', name: 'UNILAG Tuition', code: '033', accountNumber: '5566778899' },
        { id: '5', category: 'School Fees', name: 'ABU Zaria Fees', code: '035', accountNumber: '9988776655' },
        { id: '6', category: 'Registration', name: 'JAMB PIN Purchase', code: '070', accountNumber: '4433221100' },
        { id: '7', category: 'Registration', name: 'WAEC Exam PIN', code: '050', accountNumber: '6677881122' },
        { id: '8', category: 'Electronic', name: 'DSTV Subscription', code: '044', accountNumber: '8899001122' },
    ];
}