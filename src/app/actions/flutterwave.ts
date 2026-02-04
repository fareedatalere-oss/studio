'use server';

interface VirtualAccountPayload {
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    bvn: string;
}

export async function generateVirtualAccount(payload: VirtualAccountPayload) {
    try {
        const response = await fetch('https://api.flutterwave.com/v3/virtual-account-numbers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
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
    } catch (error) {
        console.error('Flutterwave API Error:', error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}


export async function resolveAccountNumber(payload: { accountNumber: string; bankCode: string }) {
    try {
        const response = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account_number: payload.accountNumber,
                account_bank: payload.bankCode,
            }),
        });
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.account_name) {
            return { success: true, data: data.data }; // returns { account_number, account_name }
        } else {
            return { success: false, message: data.message || 'Failed to resolve account name.' };
        }
    } catch (error) {
        console.error('Flutterwave Resolve API Error:', error);
        return { success: false, message: 'An unexpected error occurred while resolving account.' };
    }
}
