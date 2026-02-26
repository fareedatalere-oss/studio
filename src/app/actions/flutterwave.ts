
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
            },
            signal: controller.signal,
            cache: 'force-cache'
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data, message: 'Banks fetched successfully.' };
        } else {
            console.error("Flutterwave API Error (getBankList):", data);
            return { success: false, message: data.message || 'Failed to fetch bank list.', data: [] };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, message: 'The request to the payment service timed out.', data: [] };
        }
        return { success: false, message: error.message || 'An unexpected error occurred while fetching banks.', data: [] };
    }
}

export async function syncVirtualAccountPayments(userId: string, userEmail?: string) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: "API key missing" };

    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        
        // Use provided email or fall back to profile email
        const email = userEmail || profile.email;
        if (!email) return { success: false, message: "No email associated with profile" };

        const response = await fetch(`https://api.flutterwave.com/v3/transactions?customer_email=${email}&status=successful`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` }
        });
        const data = await response.json();

        if (data.status !== 'success' || !data.data) {
            return { success: false, message: "Could not fetch data from Flutterwave" };
        }

        const remoteTransactions = data.data;
        const processedIds = profile.processedTransactions || [];
        let totalNewAmount = 0;
        let newProcessedIds = [...processedIds];
        let foundNew = false;

        for (const tx of remoteTransactions) {
            const txId = tx.id.toString();
            if (!processedIds.includes(txId)) {
                totalNewAmount += tx.amount;
                newProcessedIds.push(txId);
                foundNew = true;

                await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                    userId: userId,
                    type: 'deposit',
                    amount: tx.amount,
                    status: 'completed',
                    recipientName: 'Wallet Credit',
                    recipientDetails: `Flutterwave Ref: ${tx.tx_ref}`,
                    narration: `Automated credit for payment ID ${txId}`,
                    sessionId: txId,
                });
            }
        }

        if (foundNew) {
            const newBalance = (profile.nairaBalance || 0) + totalNewAmount;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
                nairaBalance: newBalance,
                processedTransactions: newProcessedIds,
                lastSyncAt: new Date().toISOString(),
                // Also save the email if it was missing to prevent future issues
                email: profile.email || email 
            });
            return { success: true, amountAdded: totalNewAmount };
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
            lastSyncAt: new Date().toISOString()
        });

        return { success: true, amountAdded: 0 };

    } catch (error: any) {
        console.error("Sync Error:", error);
        return { success: false, message: error.message };
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
        });

        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.account_number) {
            return { success: true, data: data.data };
        } else {
            return { success: false, message: data.message || 'Failed to generate account number.' };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred connecting to the payment service.' };
    }
}

export async function resolveAccountNumber(payload: { accountNumber: string; bankCode: string }) {
     if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

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
        });
        
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.account_name) {
            return { success: true, data: data.data };
        } else {
            return { success: false, message: data.message || 'Failed to resolve account name.' };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred while resolving account.' };
    }
}

export async function makeBankTransfer(payload: { userId: string, pin: string, bankCode: string; accountNumber: string; amount: number; narration: string; recipientName: string, bankName: string }) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }
    
    const sessionId = `ipay-transfer-${Date.now()}`;
    let txDbId: string | null = null;
    const transferAmount = Number(payload.amount);

    try {
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
    } catch (dbError: any) {
        return { success: false, message: "Failed to initiate transaction log." };
    }

    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);

        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (transferAmount <= 0) throw new Error('Invalid transfer amount.');
        if (userProfile.nairaBalance < transferAmount) throw new Error('Insufficient balance.');

        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account_bank: payload.bankCode,
                account_number: payload.accountNumber,
                amount: transferAmount,
                narration: payload.narration || `I-Pay Transfer to ${payload.recipientName}`,
                currency: "NGN",
                debit_currency: "NGN",
                reference: sessionId,
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            const newNairaBalance = userProfile.nairaBalance - transferAmount;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: newNairaBalance });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { status: 'completed', sessionId: data.data.id.toString() });
            return { success: true, message: data.message || 'Transfer initiated.' };
        } else {
            console.error("Flutterwave API Error:", data);
            throw new Error(data.message || 'The transfer could not be initiated. Check your dashboard settings.');
        }
    } catch (error: any) {
        if (txDbId) await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { status: 'failed', narration: `[Error] ${error.message}` });
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function makeBillPayment(payload: { userId: string; pin: string; billerCode: string; customer: string; amount: number; type: string; narration: string; }) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    const sessionId = `ipay-bill-${Date.now()}`;
    let txDbId: string | null = null;
    const billAmount = Number(payload.amount);

    try {
        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: payload.userId,
            type: payload.type.toLowerCase().replace(' ', '_'),
            amount: billAmount,
            status: 'pending',
            recipientName: payload.narration,
            recipientDetails: payload.customer,
            narration: payload.narration,
            sessionId: sessionId,
        });
        txDbId = doc.$id;
    } catch (dbError: any) {
        return { success: false, message: "Failed to initiate transaction log." };
    }

    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (userProfile.nairaBalance < billAmount) throw new Error('Insufficient balance.');

        const fwResponse = await fetch('https://api.flutterwave.com/v3/bills', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                country: 'NG',
                customer: payload.customer,
                amount: billAmount,
                type: payload.billerCode,
                reference: sessionId,
            }),
        });
        
        const fwData = await fwResponse.json();

        if (fwData.status === 'success' || fwData.status === 'pending') {
            const newBalance = userProfile.nairaBalance - billAmount;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: newBalance });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { status: 'completed', sessionId: fwData.data?.flw_ref || sessionId });
            return { success: true, message: fwData.data?.response_message || `${payload.narration} successful.` };
        } else {
            throw new Error(fwData.message || 'The transaction failed.');
        }
    } catch (error: any) {
        if (txDbId) await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, txDbId, { status: 'failed', narration: `[Error] ${error.message}` });
        return { success: false, message: error.message || 'An unexpected server error occurred.' };
    }
}

const billCategoryMapping = {
    airtime: 'airtime=1',
    data: 'data_bundle=1',
    tv: 'cables=1',
    electricity: 'power=1',
    education: 'education=1',
};

export async function getUtilityProviders(type: 'airtime' | 'data' | 'tv' | 'electricity' | 'education') {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    }
    try {
        const query = billCategoryMapping[type];
        const response = await fetch(`https://api.flutterwave.com/v3/bill-categories?${query}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            next: { revalidate: 3600 }
        });
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data };
        } else {
            return { success: false, message: data.message || `Failed to fetch providers.`, data: [] };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.', data: [] };
    }
}

export async function getUtilityPlans(billerCode: string) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    }
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/bill-categories?biller_code=${billerCode}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            next: { revalidate: 3600 }
        });
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data };
        } else {
            return { success: false, message: data.message || `Failed to fetch plans.`, data: [] };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.', data: [] };
    }
}

export async function getCardVerificationLink(payload: { userId: string; email: string; name: string; redirectUrl: string; }) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }
    try {
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tx_ref: `ipay-verify-${payload.userId}-${Date.now()}`,
                amount: 49,
                currency: 'NGN',
                redirect_url: payload.redirectUrl,
                customer: { email: payload.email, name: payload.name },
                meta: { user_id: payload.userId },
                customizations: { title: 'I-Pay Card Verification', logo: 'https://ipay.com/logo.png' }
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            return { success: true, data: data.data };
        } else {
            return { success: false, message: data.message || 'Could not initiate card verification.' };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function verifyCardPayment(transactionId: string, userId: string) {
     if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` }
        });
        const data = await response.json();

        if (data.status === 'success' && data.data.status === 'successful' && data.data.amount === 49) {
            const cardToken = data.data.card?.token;
            if (!cardToken) throw new Error("Card token not found.");
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { fwCardToken: cardToken });
            return { success: true, message: 'Card verified and saved successfully!' };
        } else {
             throw new Error(data.message || 'Card verification failed.');
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function chargeTokenizedCard(payload: { userId: string; amount: number; pin: string }) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }
     try {
        const { userId, amount, pin } = payload;
        const depositAmount = Number(amount);
        if (isNaN(depositAmount) || depositAmount < 100) throw new Error('Minimum funding amount is ₦100.');

        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        if (userProfile.pin !== pin) throw new Error('Incorrect transaction PIN.');
        if (!userProfile.fwCardToken) throw new Error('No saved card found.');

        let fee = 0;
        if (depositAmount >= 100 && depositAmount <= 1000) fee = 49;
        else if (depositAmount > 1000) fee = 95;
        
        const totalCharge = depositAmount + fee;
        
        const response = await fetch('https://api.flutterwave.com/v3/tokenized-charges', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: userProfile.fwCardToken,
                currency: "NGN",
                country: "NG",
                amount: totalCharge,
                email: userProfile.email,
                fullname: `${userProfile.firstName} ${userProfile.lastName}`,
                tx_ref: `ipay-fund-${userId}-${Date.now()}`
            })
        });

        const data = await response.json();

        if (data.status === 'success' && data.data?.status === 'successful') {
            const newNairaBalance = (userProfile.nairaBalance || 0) + depositAmount;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { nairaBalance: newNairaBalance });
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: userId,
                type: 'deposit',
                amount: depositAmount,
                status: 'completed',
                recipientName: 'Account Funding',
                recipientDetails: `Card Deposit (Fee: ₦${fee})`,
                narration: `Funded account with ₦${depositAmount.toLocaleString()}`,
                sessionId: data.data.id,
            });
            return { success: true, message: `Account funded with ₦${depositAmount.toLocaleString()}.` };
        } else {
            throw new Error(data.message || 'Payment failed.');
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
