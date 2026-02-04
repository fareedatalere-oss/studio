'use server';

const FLUTTERWAVE_API_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Your API key is not configured. Please contact an administrator.';
const REQUEST_TIMEOUT = 15000; // 15 seconds

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
