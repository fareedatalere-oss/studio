'use server';
import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

const FLUTTERWAVE_API_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Your API key is not configured. Please contact an administrator.';
const REQUEST_TIMEOUT = 15000; // 15 seconds

export async function getBankList() {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        // Flutterwave uses NG as the country code for Nigeria
        const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
            },
            signal: controller.signal,
            cache: 'force-cache' // Cache the response to avoid repeated calls
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data, message: 'Banks fetched successfully.' }; // data is an array of banks { id, code, name }
        } else {
            console.error("Flutterwave API Error (getBankList):", data);
            return { success: false, message: data.message || 'Failed to fetch bank list.', data: [] };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, message: 'The request to the payment service timed out.', data: [] };
        }
        console.error("Flutterwave Connection Error (getBankList):", error);
        return { success: false, message: error.message || 'An unexpected error occurred while fetching banks.', data: [] };
    }
}


interface VirtualAccountPayload {
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    bvn: string;
}

export async function generateVirtualAccount(payload: VirtualAccountPayload) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

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
                tx_ref: `ipay-tx-${Date.now()}`
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.account_number) {
            return { success: true, data: data.data };
        } else {
            console.error("Flutterwave API Error:", data);
            return { success: false, message: data.message || 'Failed to generate account number.' };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, message: 'The request to the payment service timed out. Please try again.' };
        }
        console.error("Flutterwave Connection Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred connecting to the payment service.' };
    }
}


export async function resolveAccountNumber(payload: { accountNumber: string; bankCode: string }) {
     if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account_number: payload.accountNumber,
                account_bank: payload.bankCode,
            }),
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.account_name) {
            return { success: true, data: data.data }; // returns { account_number, account_name }
        } else {
            console.error("Flutterwave API Error:", data);
            return { success: false, message: data.message || 'Failed to resolve account name.' };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, message: 'The request to the payment service timed out. Please try again.' };
        }
        console.error("Flutterwave Connection Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred while resolving account.' };
    }
}

export async function makeBillPayment(payload: {
    userId: string;
    pin: string;
    billerCode: string;
    customer: string;
    amount: number;
    type: string;
    narration: string;
}) {
     if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    try {
        // 1. Fetch user profile & validate
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);

        if (userProfile.pin !== payload.pin) {
            throw new Error('Incorrect transaction PIN.');
        }
        if (userProfile.nairaBalance < payload.amount) {
            throw new Error('Insufficient balance.');
        }

        // 2. Make payment via Flutterwave
        const reference = `ipay-bill-${Date.now()}`;
        const fwResponse = await fetch('https://api.flutterwave.com/v3/bills', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                country: 'NG',
                customer: payload.customer,
                amount: payload.amount,
                type: payload.billerCode, // Biller code like 'BIL108'
                reference: reference,
                // recurrence: 'ONCE', // Seems to cause issues, removing for wider compatibility
            }),
        });
        
        const fwData = await fwResponse.json();

        if (fwData.status === 'success') {
            // 3. Deduct balance and record transaction
            const newBalance = userProfile.nairaBalance - payload.amount;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, {
                nairaBalance: newBalance,
            });

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: payload.type.toLowerCase().replace(' ', '_'),
                amount: payload.amount,
                status: 'completed',
                recipientName: payload.narration,
                recipientDetails: payload.customer,
                narration: payload.narration,
                sessionId: reference,
            });

            return { success: true, message: `${payload.narration} successful.` };
        } else {
             console.error("Flutterwave Bill Payment Error:", fwData);
            throw new Error(fwData.message || 'The transaction failed at the provider.');
        }

    } catch (error: any) {
        console.error("Bill payment server action error:", error);
        return { success: false, message: error.message || 'An unexpected server error occurred.' };
    }
}
