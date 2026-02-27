
'use server';

import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

// Ensure token is cleaned of any unexpected spaces
const DATAHOUSE_TOKEN = (process.env.DATAHOUSE_TOKEN || '').trim(); 
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

        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);

        if (profile.pin !== payload.pin) {
            throw new Error('Incorrect transaction PIN.');
        }

        const currentBalance = Number(profile.nairaBalance || 0);
        if (currentBalance < totalToDebit) {
            throw new Error(`Insufficient funds. Your balance is ₦${currentBalance.toLocaleString()}.`);
        }

        if (!DATAHOUSE_TOKEN) {
            throw new Error("Provider configuration missing. Please check your token settings.");
        }

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
                Meter_Type: 1
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DATAHOUSE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        // Enhanced success check based on Datahouse response patterns
        const isSuccess = response.ok && (
            String(result.Status).toLowerCase() === 'success' || 
            String(result.status).toLowerCase() === 'success' || 
            result.id || 
            result.Status === 'Success'
        );

        if (isSuccess) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, {
                nairaBalance: currentBalance - totalToDebit
            });

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: payload.type === 'cable' ? 'tv_subscription' : (payload.type === 'electric' ? 'electricity' : payload.type),
                amount: payload.amount,
                status: 'completed',
                recipientName: payload.description,
                recipientDetails: payload.customer,
                narration: `Processed via Datahouse. Total Debit: ₦${totalToDebit}.`,
                sessionId: `dh-${Date.now()}`,
            });

            return { success: true, message: "Transaction successful." };
        } else {
            // Precise error capturing to resolve "Invalid token header" or other provider issues
            const errorDetail = result.error || result.msg || result.message || result.Status || result.detail || "Provider declined the request.";
            throw new Error(`Provider Error: ${errorDetail}`);
        }

    } catch (error: any) {
        console.error("Datahouse Action Error:", error);
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}
