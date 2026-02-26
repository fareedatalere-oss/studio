import { databases, DATABASE_ID, COLLECTION_ID_APPS, COLLECTION_ID_PRODUCTS, COLLECTION_ID_BOOKS, COLLECTION_ID_UPWORK_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Suspense } from 'react';
import MarketContentClient from './market-content-client';
import { Loader2 } from 'lucide-react';

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const params = await searchParams;
    const initialTab = params.tab || 'apps';

    // Fetch initial data on server for instant load
    const [appsRes, productsRes, booksRes, upworkRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_APPS, [Query.orderDesc('$createdAt'), Query.limit(50)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_PRODUCTS, [Query.orderDesc('$createdAt'), Query.limit(50)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_BOOKS, [Query.orderDesc('$createdAt'), Query.limit(50)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_UPWORK_PROFILES, [Query.orderDesc('$createdAt'), Query.limit(50)])
    ]);

    const initialData = {
        apps: appsRes.documents.filter(doc => !doc.isBanned && !doc.isHidden),
        products: productsRes.documents.filter(doc => !doc.isBanned && !doc.isHidden),
        books: booksRes.documents.filter(doc => !doc.isBanned && !doc.isHidden),
        upwork: upworkRes.documents.filter(doc => !doc.isBanned),
    };

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <MarketContentClient initialData={initialData} initialTab={initialTab} />
        </Suspense>
    );
}