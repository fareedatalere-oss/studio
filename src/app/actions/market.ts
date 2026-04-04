
'use server';

import { databases, COLLECTION_ID_PROFILES, DATABASE_ID, COLLECTION_ID_PRODUCTS, COLLECTION_ID_TRANSACTIONS, COLLECTION_ID_BOOKS, ID } from '@/lib/appwrite';

const PRODUCT_COMMISSION = 80;
const BOOK_COMMISSION = 50;

export async function purchaseProduct(payload: {
    buyerId: string;
    product: any;
    pin: string;
}) {
    let buyerTxId: string | null = null;
    let sellerTxId: string | null = null;
    const { buyerId, product, pin } = payload;
    const sessionId = `ipay-product-${product.$id}-${Date.now()}`;

    try {
        const buyerProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, buyerId);
        const totalCost = product.price + PRODUCT_COMMISSION;

        if (buyerProfile.nairaBalance < totalCost) {
            throw new Error('Insufficient balance to complete this purchase.');
        }

        if (buyerProfile.pin !== pin) {
            throw new Error('Incorrect transaction PIN.');
        }

        const sellerProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, product.sellerId);

        const buyerTxPromise = databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: buyerId,
            type: 'product_purchase',
            amount: totalCost,
            status: 'pending',
            recipientName: `Purchase: ${product.name}`,
            recipientDetails: `@${sellerProfile.username}`,
            narration: sellerProfile.uid, 
            sessionId: `${sessionId}-buyer`,
        });
        const sellerTxPromise = databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
            userId: product.sellerId,
            type: 'product_sale',
            amount: product.price,
            status: 'pending',
            recipientName: `Sale: ${product.name}`,
            recipientDetails: `@${buyerProfile.username}`,
            narration: buyerProfile.uid,
            sessionId: `${sessionId}-seller`,
        });

        const [buyerTxDoc, sellerTxDoc] = await Promise.all([buyerTxPromise, sellerTxPromise]);
        buyerTxId = buyerTxDoc.$id;
        sellerTxId = sellerTxDoc.$id;

        const newBuyerBalance = buyerProfile.nairaBalance - totalCost;
        const newSellerBalance = sellerProfile.nairaBalance + product.price;

        const buyerUpdatePromise = databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, buyerId, { nairaBalance: newBuyerBalance });
        const sellerUpdatePromise = databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, product.sellerId, { nairaBalance: newSellerBalance });
        
        await Promise.all([buyerUpdatePromise, sellerUpdatePromise]);

        const buyerTxUpdatePromise = databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, buyerTxId, { status: 'completed' });
        const sellerTxUpdatePromise = databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, sellerTxId, { status: 'completed' });

        await Promise.all([buyerTxUpdatePromise, sellerTxUpdatePromise]);

        return { success: true, message: 'Purchase successful!' };

    } catch (error: any) {
        const failureMessage = `[Error] ${error.message}`;
        if (buyerTxId) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, buyerTxId, { status: 'failed', narration: failureMessage });
        }
        if (sellerTxId) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, sellerTxId, { status: 'failed', narration: failureMessage });
        }
        console.error("Product Purchase Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred during purchase.' };
    }
}


export async function purchaseBook(payload: {
    buyerId: string;
    bookId: string;
    pin: string; 
}) {
    let buyerTxId: string | null = null;
    let sellerTxId: string | null = null;
    const sessionId = `ipay-book-${payload.bookId}-${Date.now()}`;

    try {
        const { buyerId, bookId, pin } = payload;
        const [buyerProfile, book] = await Promise.all([
            databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, buyerId),
            databases.getDocument(DATABASE_ID, COLLECTION_ID_BOOKS, bookId),
        ]);

        if (book.priceType === 'paid') {
            if (!pin || pin.length !== 5) throw new Error("A valid 5-digit PIN is required for paid books.");
            
            const totalCost = book.price + BOOK_COMMISSION;
            if (buyerProfile.nairaBalance < totalCost) throw new Error("Insufficient balance.");
            
            if (buyerProfile.pin !== pin) throw new Error("Incorrect transaction PIN.");
            
            const sellerProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, book.sellerId);
            
            const buyerTxPromise = databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: buyerId,
                type: 'product_purchase',
                amount: totalCost,
                status: 'completed',
                recipientName: `Book: ${book.name}`,
                recipientDetails: `@${sellerProfile.username}`,
                narration: sellerProfile.uid,
                sessionId: `${sessionId}-buyer`,
            });
            const sellerTxPromise = databases.createDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, ID.unique(), {
                userId: book.sellerId,
                type: 'product_sale',
                amount: book.price,
                status: 'completed',
                recipientName: `Sale: ${book.name}`,
                recipientDetails: `@${buyerProfile.username}`,
                narration: buyerProfile.uid,
                sessionId: `${sessionId}-seller`,
            });

            await Promise.all([buyerTxPromise, sellerTxPromise]);

            const newBuyerBalance = buyerProfile.nairaBalance - totalCost;
            const newSellerBalance = sellerProfile.nairaBalance + book.price;

            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, buyerId, { nairaBalance: newBuyerBalance });
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, book.sellerId, { nairaBalance: newSellerBalance });
        }
        
        return { success: true, message: `Payment for "${book.name}" was successful.` };

    } catch (error: any) {
        console.error("Book Purchase Error:", error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
