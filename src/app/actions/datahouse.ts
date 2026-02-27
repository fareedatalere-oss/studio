
'use server';

import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

/**
 * Strictly hardcoded token as provided by user.
 */
const DATAHOUSE_TOKEN = '80ca2a529de4afa096c4eabefeb275dafe3a8941'; 
const BASE_URL = 'https://datahouse.com.ng/api';

const getNetworkId = (name: string): number => {
    const n = name.toUpperCase();
    if (n.includes('MTN')) return 1;
    if (n.includes('GLO')) return 2;
    if (n.includes('AIRTEL')) return 3;
    if (n.includes('9MOBILE')) return 4;
    return 1;
};

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

        let endpoint = '';
        let body: any = {};

        // 3. Prepare Datahouse Payload
        if (payload.type === 'airtime') {
            endpoint = `${BASE_URL}/topup/`;
            body = {
                network: getNetworkId(payload.description),
                amount: Number(payload.amount),
                mobile_number: payload.customer,
                Ported_number: true,
                airtime_type: "SHARE AND SELL"
            };
        } else if (payload.type === 'data') {
            endpoint = `${BASE_URL}/data/`;
            body = {
                network: getNetworkId(payload.description),
                plan: Number(payload.providerId),
                mobile_number: payload.customer,
                Ported_number: true
            };
        } else if (payload.type === 'cable') {
            endpoint = `${BASE_URL}/cabletv/`;
            body = {
                cablename: payload.description.toUpperCase().includes('GOTV') ? 1 : (payload.description.toUpperCase().includes('DSTV') ? 2 : 3),
                cableplan: Number(payload.providerId),
                smart_card_number: payload.customer
            };
        } else if (payload.type === 'electric') {
            endpoint = `${BASE_URL}/billpayment/`;
            body = {
                disco_name: Number(payload.providerId),
                meter_number: payload.customer,
                amount: Number(payload.amount),
                Meter_Type: 1
            };
        }

        // 4. Send request with strictly formatted header
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + DATAHOUSE_TOKEN.trim(),
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // Parse response carefully
        let result: any = {};
        try {
            result = await response.json();
        } catch (e) {
            const rawText = await response.text();
            throw new Error(`Invalid response from provider: ${rawText.substring(0, 100)}`);
        }

        // 5. Check Success
        const statusStr = String(result.Status || result.status || "").toLowerCase();
        const isSuccess = response.ok && (statusStr === 'success' || !!result.id || !!result.Status === true);

        if (isSuccess) {
            // Debit User
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, {
                nairaBalance: currentBalance - totalToDebit
            });

            // Log Transaction
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: payload.type === 'cable' ? 'tv_subscription' : (payload.type === 'electric' ? 'electricity' : payload.type),
                amount: payload.amount,
                status: 'completed',
                recipientName: payload.description,
                recipientDetails: payload.customer,
                narration: `Processed via Datahouse. ID: ${result.id || 'N/A'}`,
                sessionId: `dh-${Date.now()}`,
            });

            return { success: true, message: "Transaction successful." };
        } else {
            // Captured failure detail from provider for precise debugging
            const detail = result.error || result.msg || result.message || result.Status || result.detail || JSON.stringify(result);
            throw new Error(`Provider Declined: ${detail}`);
        }

    } catch (error: any) {
        console.error("Datahouse Action Error:", error);
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}
