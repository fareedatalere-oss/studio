
'use server';
import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

const FLUTTERWAVE_API_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Your API key is not configured. Please contact an administrator.';
const REQUEST_TIMEOUT = 20000; // 20 seconds

export async function getBankList() {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    }

    try {
        const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            cache: 'force-cache'
        });
        const data = await response.json();
        if (data.status === 'success') return { success: true, data: data.data };
        return { success: false, message: data.message || 'Failed to fetch banks.', data: [] };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function getFlutterwaveDataPlans(type: string) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/bill-categories?data=1`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
            const filtered = data.data.filter((item: any) => item.name.toUpperCase().includes(type.toUpperCase()));
            const plans = filtered.map((item: any) => ({
                name: item.name,
                price: item.amount,
                biller_code: item.biller_code,
                item_code: item.item_code
            })).sort((a: any, b: any) => a.price - b.price);
            return { success: true, data: plans };
        }
        return { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function initiateFlutterwaveBill(payload: { userId: string, pin: string, customer: string, amount: number, type: string, billerCode: string, isData?: boolean }) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    
    const MY_CHARGE = 3;
    const totalDebit = payload.amount + MY_CHARGE;

    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (userProfile.nairaBalance < totalDebit) throw new Error('Insufficient balance.');

        const response = await fetch('https://api.flutterwave.com/v3/bills', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                country: "NG",
                customer: payload.customer,
                amount: payload.amount,
                type: payload.isData ? payload.billerCode : payload.type,
                reference: `ipay-bill-${Date.now()}`
            }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { 
                nairaBalance: userProfile.nairaBalance - totalDebit 
            });

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: payload.isData ? 'data' : 'airtime',
                amount: payload.amount,
                status: 'completed',
                recipientName: `${payload.type} ${payload.isData ? 'Data' : 'Airtime'}`,
                recipientDetails: payload.customer,
                narration: `Service charge of ₦${MY_CHARGE} applied.`,
                sessionId: data.data?.reference || `ref-${Date.now()}`,
            });

            return { success: true, message: "Purchase successful via Flutterwave." };
        } else {
            throw new Error(data.message || "Flutterwave declined the request.");
        }
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function syncVirtualAccountPayments(userId: string, userEmail?: string) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: "API key is not configured correctly." };

    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        const email = userEmail || profile.email;
        
        if (!email) return { success: false, message: "No email associated with this account." };

        const response = await fetch(`https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(email)}&status=successful`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            cache: 'no-store',
        });
        
        const data = await response.json();
        if (data.status !== 'success') return { success: false, message: data.message };

        const remoteTransactions = data.data || [];
        let totalNewAmount = 0;
        let foundNew = false;

        for (const tx of remoteTransactions) {
            const txId = tx.id.toString();
            const existingRecords = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                Query.equal('sessionId', txId),
                Query.limit(1)
            ]);

            if (existingRecords.total === 0) {
                totalNewAmount += Number(tx.amount);
                foundNew = true;

                await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                    userId: userId,
                    type: 'deposit',
                    amount: Number(tx.amount),
                    status: 'completed',
                    recipientName: 'Wallet Credit',
                    recipientDetails: `Deposit: ${tx.payment_type || 'Transfer'}`,
                    narration: tx.narration || `Ref: ${tx.tx_ref}`,
                    sessionId: txId,
                });
            }
        }

        if (foundNew) {
            const currentBalance = Number(profile.nairaBalance || 0);
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { nairaBalance: currentBalance + totalNewAmount });
            return { success: true, amountAdded: totalNewAmount, message: `Successfully updated! Added ₦${totalNewAmount.toLocaleString()} to balance.` };
        }

        return { success: true, amountAdded: 0, message: "Your balance is accurate and up to date." };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function initiateFlutterwaveAirtime(payload: { userId: string, pin: string, customer: string, amount: number, type: string }) {
    return initiateFlutterwaveBill({ ...payload, billerCode: 'AIRTIME' });
}

export async function generateVirtualAccount(payload: any) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.flutterwave.com/v3/virtual-account-numbers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...payload, is_permanent: true, tx_ref: `v-acc-${Date.now()}` }),
        });
        const data = await response.json();
        if (data.status === 'success') return { success: true, data: data.data };
        return { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function makeBillPayment(payload: any) { return { success: false, message: "Service not implemented." }; }
export async function getUtilityProviders(type: string) { return { success: false, data: [] }; }
export async function getUtilityPlans(billerCode: string) { return { success: false, data: [] }; }

export async function getCardVerificationLink(payload: { userId: string, email: string, name: string, redirectUrl: string }) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tx_ref: `card-ver-${payload.userId}-${Date.now()}`,
                amount: '100',
                currency: 'NGN',
                redirect_url: payload.redirectUrl,
                customer: { email: payload.email, name: payload.name },
                customizations: { title: 'I-Pay Card Verification', description: 'Adding card for future funding.' }
            }),
        });
        const data = await response.json();
        if (data.status === 'success') return { success: true, data: data.data };
        return { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function verifyCardPayment(transactionId: string, userId: string) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` }
        });
        const data = await response.json();
        if (data.status === 'success' && data.data.status === 'successful') {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { fwCardToken: data.data.card.token });
            return { success: true };
        }
        return { success: false, message: 'Card verification failed.' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function chargeTokenizedCard(payload: { userId: string, amount: number, pin: string }) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (profile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (!profile.fwCardToken) throw new Error('No saved card found.');

        const response = await fetch('https://api.flutterwave.com/v3/tokenized-charges', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: profile.fwCardToken, currency: 'NGN', amount: payload.amount, email: profile.email, tx_ref: `fund-${payload.userId}-${Date.now()}` }),
        });
        const data = await response.json();
        if (data.status === 'success') {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: (profile.nairaBalance || 0) + payload.amount });
            return { success: true, message: `Successfully funded ₦${payload.amount.toLocaleString()}.` };
        }
        return { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
