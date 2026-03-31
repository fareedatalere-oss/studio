'use server';
import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

const FLUTTERWAVE_API_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const API_KEY_ERROR_MESSAGE = 'Configuration error. Please contact an administrator.';

export async function syncVirtualAccountPayments(userId: string, userEmail?: string) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: "Configuration error." };

    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId);
        const email = userEmail || profile.email;
        if (!email) return { success: false, message: "No email associated with this account." };

        const response = await fetch(`https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(email)}&status=successful`, {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY.trim()}` },
            cache: 'no-store',
        });
        
        const data = await response.json();
        if (data.status !== 'success') return { success: false, message: data.message };

        const remoteTransactions = data.data || [];
        let totalNetCredited = 0;
        let foundNew = false;
        const FEE = 12; // Master Instruction: Incoming transfer charge is 12 Naira

        for (const tx of remoteTransactions) {
            const txId = tx.id.toString();
            const existingRecords = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [
                Query.equal('sessionId', txId),
                Query.limit(1)
            ]);

            if (existingRecords.total === 0) {
                const incomingAmount = Number(tx.amount);
                const netAmount = incomingAmount - FEE;
                
                if (netAmount > 0) {
                    totalNetCredited += netAmount;
                    foundNew = true;

                    // Log Transaction
                    await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                        userId: userId,
                        type: 'deposit',
                        amount: netAmount,
                        status: 'completed',
                        recipientName: 'Wallet Credit',
                        recipientDetails: `Deposit: ${tx.payment_type || 'Transfer'}`,
                        narration: `Charge of ₦${FEE} applied. Original: ₦${incomingAmount}`,
                        sessionId: txId,
                    });

                    // Trigger Force Notification
                    await databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
                        userId: userId,
                        senderId: 'ipay_system',
                        type: 'payment',
                        description: `You received ₦${netAmount.toLocaleString()}. (Fee: ₦${FEE} deducted)`,
                        isRead: false,
                        link: `/dashboard/history`,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        }

        if (foundNew) {
            const currentBalance = Number(profile.nairaBalance || 0);
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, userId, { nairaBalance: currentBalance + totalNetCredited });
            return { success: true, amountAdded: totalNetCredited, message: `Successfully updated! Added ₦${totalNetCredited.toLocaleString()} to balance.` };
        }

        return { success: true, amountAdded: 0, message: "Your balance is up to date." };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function generateVirtualAccount(payload: any) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.flutterwave.com/v3/virtual-account-numbers', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, is_permanent: true, tx_ref: `v-acc-${Date.now()}` }),
        });
        const data = await response.json();
        return data.status === 'success' ? { success: true, data: data.data } : { success: false, message: data.message };
    } catch (e: any) {
        return { success: false, message: "Network error." };
    }
}

export async function initiateFlutterwaveBill(payload: { 
    userId: string, pin: string, customer: string, amount: number, billerCode: string, itemCode?: string, narration?: string 
}) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    const FEE = 3; // Fixed airtime/data fee
    const totalDebit = Number(payload.amount) + FEE;
    try {
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId);
        if (userProfile.pin !== payload.pin) throw new Error('Incorrect transaction PIN.');
        if (userProfile.nairaBalance < totalDebit) throw new Error(`Insufficient funds.`);
        const response = await fetch('https://api.flutterwave.com/v3/bills', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: "NG", customer: payload.customer, amount: payload.amount, type: payload.billerCode, item_code: payload.itemCode || payload.billerCode, reference: `ipay-bill-${Date.now()}` }),
        });
        const data = await response.json();
        if (data.status === 'success') {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, payload.userId, { nairaBalance: userProfile.nairaBalance - totalDebit });
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: payload.userId, type: 'airtime', amount: payload.amount, status: 'completed', recipientName: payload.narration || 'Bill Payment', recipientDetails: payload.customer, narration: `Fee of ₦${FEE} applied.`, sessionId: data.data?.reference || `ref-${Date.now()}`,
            });
            return { success: true, message: "Transaction successful." };
        } else {
            throw new Error(data.message);
        }
    } catch (e: any) { return { success: false, message: e.message }; }
}

export async function getBillCategories(type?: string) {
    if (!FLUTTERWAVE_API_KEY) return { success: false, message: API_KEY_ERROR_MESSAGE };
    try {
        const response = await fetch('https://api.flutterwave.com/v3/bill-categories', {
            headers: { 'Authorization': `Bearer ${FLUTTERWAVE_API_KEY.trim()}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
            let filtered = data.data;
            if (type && type !== 'All') {
                filtered = filtered.filter((item: any) => item.bill_group.toUpperCase() === type.toUpperCase() || item.name.toUpperCase().includes(type.toUpperCase()));
            }
            return { success: true, data: filtered };
        }
        return { success: false, message: data.message };
    } catch (e: any) { return { success: false, message: e.message }; }
}