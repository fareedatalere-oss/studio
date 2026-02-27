
'use server';

import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

// Ensure the token is used with the required "Token " prefix
const DATAHOUSE_TOKEN = process.env.DATAHOUSE_TOKEN; 
const BASE_URL = 'https://datahouse.com.ng/api';

/**
 * Maps Network names to Datahouse Network IDs
 */
const getNetworkId = (name: string): number => {
    const n = name.toUpperCase();
    if (n.includes('MTN')) return 1;
    if (n.includes('GLO')) return 2;
    if (n.includes('AIRTEL')) return 3;
    if (n.includes('9MOBILE')) return 4;
    return 1;
};

/**
 * Processes recharges via Datahouse.com.ng with strictly formatted requests
 */
export async function processDatahouseRecharge(payload: {
    userId: string;
    pin: string;
    type: 'data' | 'airtime' | 'cable' | 'electric';
    providerId: string | number; 
    customer: string; 
    amount: number;
    fee: number;
    description: string;
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

        // 3. Prepare Datahouse API Call
        let endpoint = '';
        let body: any = {};

        if (payload.type === 'airtime') {
            endpoint = `${BASE_URL}/topup/`;
            body = {
                network: getNetworkId(payload.description),
                amount: payload.amount,
                mobile_number: payload.customer,
                Port: true,
                airtime_type: "Share and Sell"
            };
        } else if (payload.type === 'data') {
            endpoint = `${BASE_URL}/data/`;
            body = {
                network: getNetworkId(payload.description),
                plan: payload.providerId,
                mobile_number: payload.customer,
                Port: true
            };
        } else if (payload.type === 'cable') {
            endpoint = `${BASE_URL}/cabletv/`;
            body = {
                cablename: payload.description.toUpperCase().includes('GOTV') ? 1 : (payload.description.toUpperCase().includes('DSTV') ? 2 : 3),
                cableplan: payload.providerId,
                smart_card_number: payload.customer
            };
        } else if (payload.type === 'electric') {
            endpoint = `${BASE_URL}/billpayment/`;
            body = {
                disco_name: payload.providerId,
                meter_number: payload.customer,
                amount: payload.amount,
                Meter_Type: 1 // Default to Prepaid
            };
        }

        // 4. Call Datahouse API with the strictly required "Token " prefix
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DATAHOUSE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        // Datahouse returns status in various formats depending on endpoint
        const isSuccess = response.ok && (result.Status === 'success' || result.status === 'success' || result.id);

        if (isSuccess) {
            // 5. Perform Debit (Silent)
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, {
                nairaBalance: currentBalance - totalToDebit
            });

            // 6. Log Transaction
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: payload.type === 'cable' ? 'tv_subscription' : (payload.type === 'electric' ? 'electricity' : payload.type),
                amount: payload.amount,
                status: 'completed',
                recipientName: payload.description,
                recipientDetails: payload.customer,
                narration: `Ref: ${result.id || Date.now()}. Fee: ₦${payload.fee}.`,
                sessionId: `dh-${Date.now()}`,
            });

            return { success: true, message: "Transaction successful." };
        } else {
            const errorMsg = result.error || result.msg || result.message || "Provider declined the request. Check API token or balance.";
            throw new Error(errorMsg);
        }

    } catch (error: any) {
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}
