'use server';
import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

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

export async function makeBankTransfer(payload: { userId: string, pin: string, bankCode: string; accountNumber: string; amount: number; narration: string; recipientName: string, bankName: string }) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }

    try {
        // 1. Fetch user profile
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);

        // 2. Check PIN
        if (userProfile.pin !== payload.pin) {
            throw new Error('Incorrect transaction PIN.');
        }

        const transferAmount = Number(payload.amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            throw new Error('Invalid transfer amount.');
        }

        // 3. Check balance
        if (userProfile.nairaBalance < transferAmount) {
            throw new Error('Insufficient balance to complete this transaction.');
        }

        // 4. Call the Flutterwave transfer API
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
                narration: payload.narration,
                currency: "NGN",
                reference: `ipay-transfer-${Date.now()}`,
                callback_url: "https://webhook.site/b3e505b0-fe02-430e-ac2d-a00e5803831c" // Placeholder callback
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // 5. Deduct balance from user profile
            const newNairaBalance = userProfile.nairaBalance - transferAmount;
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_PROFILES,
                payload.userId,
                { nairaBalance: newNairaBalance }
            );

            // 6. Save the transaction record
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId,
                type: 'transfer',
                amount: transferAmount,
                status: 'completed',
                recipientName: payload.recipientName,
                recipientDetails: `${payload.accountNumber} - ${payload.bankName}`,
                narration: payload.narration,
                sessionId: data.data.id,
            });

            return { success: true, message: data.message };
        } else {
            console.error("Flutterwave Transfer Error:", data);
            throw new Error(data.message || 'The transfer could not be initiated.');
        }

    } catch (error: any) {
        console.error("Flutterwave Transfer Connection Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
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
                type: payload.billerCode, // Biller code like 'BIL108' for airtime, or specific item code for data/tv
                reference: reference,
            }),
        });
        
        const fwData = await fwResponse.json();

        // Flutterwave bill payments can sometimes be "pending" initially. We will treat 'pending' and 'successful' as success from our side.
        if (fwData.status === 'success' || fwData.status === 'pending') {
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

            const successMessage = fwData.data?.response_message || `${payload.narration} successful.`;
            return { success: true, message: successMessage };
        } else {
             console.error("Flutterwave Bill Payment Error:", fwData);
            throw new Error(fwData.message || 'The transaction failed at the provider.');
        }

    } catch (error: any) {
        console.error("Bill payment server action error:", error);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const query = billCategoryMapping[type];
        const response = await fetch(`https://api.flutterwave.com/v3/bill-categories?${query}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            signal: controller.signal,
            next: { revalidate: 3600 } // Revalidate every hour
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data };
        } else {
            console.error("Flutterwave API Error (getUtilityProviders):", data);
            return { success: false, message: data.message || `Failed to fetch ${type} providers.`, data: [] };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, message: 'The request to the payment service timed out.', data: [] };
        }
        console.error(`Flutterwave Connection Error (getUtilityProviders for ${type}):`, error);
        return { success: false, message: error.message || 'An unexpected error occurred.', data: [] };
    }
}

export async function getUtilityPlans(billerCode: string) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE, data: [] };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(`https://api.flutterwave.com/v3/bill-categories?biller_code=${billerCode}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY}` },
            signal: controller.signal,
            next: { revalidate: 3600 }
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            return { success: true, data: data.data };
        } else {
            console.error("Flutterwave API Error (getUtilityPlans):", data);
            return { success: false, message: data.message || `Failed to fetch plans for ${billerCode}.`, data: [] };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, message: 'The request to the payment service timed out.', data: [] };
        }
        console.error(`Flutterwave Connection Error (getUtilityPlans for ${billerCode}):`, error);
        return { success: false, message: error.message || 'An unexpected error occurred.', data: [] };
    }
}


export async function getCardVerificationLink(payload: {
    userId: string;
    email: string;
    name: string;
    redirectUrl: string;
}) {
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
                customizations: { title: 'I-Pay Card Verification', logo: 'https://ipay.com/logo.png' } // Replace with your actual logo
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            return { success: true, data: data.data }; // data contains the link
        } else {
            console.error("Flutterwave API Error (getCardVerificationLink):", data);
            return { success: false, message: data.message || 'Could not initiate card verification.' };
        }
    } catch (error: any) {
        console.error("Flutterwave Connection Error (getCardVerificationLink):", error);
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
            if (!cardToken) throw new Error("Card token not found in verification response.");

            // Save the token to the user's profile
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
                fwCardToken: cardToken
            });
            return { success: true, message: 'Card verified and saved successfully!' };
        } else {
             throw new Error(data.message || 'Card verification failed.');
        }
    } catch (error: any) {
        console.error("Flutterwave Verification Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred during verification.' };
    }
}

export async function chargeTokenizedCard(payload: { userId: string; amount: number; pin: string }) {
    if (!FLUTTERWAVE_API_KEY || FLUTTERWAVE_API_KEY.includes('YOUR_FLUTTERWAVE_SECRET_KEY_HERE')) {
        return { success: false, message: API_KEY_ERROR_MESSAGE };
    }
     try {
        const { userId, amount, pin } = payload;
        const depositAmount = Number(amount);
        if (isNaN(depositAmount) || depositAmount < 100) {
            throw new Error('Minimum funding amount is ₦100.');
        }

        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);

        if (userProfile.pin !== pin) throw new Error('Incorrect transaction PIN.');
        if (!userProfile.fwCardToken) throw new Error('No saved card found for this user.');

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
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, {
                nairaBalance: newNairaBalance
            });

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

            return { success: true, message: `Your account has been funded with ₦${depositAmount.toLocaleString()}.` };
        } else {
            throw new Error(data.message || 'Payment failed at the provider.');
        }
    } catch (error: any) {
        console.error("Flutterwave Tokenized Charge Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred while funding.' };
    }
}