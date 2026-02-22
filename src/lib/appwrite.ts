import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('698462e0002b93bc85d9');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// This is the correct Database ID from your screenshot.
export const DATABASE_ID = '69857be6001af003c986';
export const BUCKET_ID_UPLOADS = 'uploads';

// Collection IDs
export const COLLECTION_ID_PROFILES = 'profiles';
export const COLLECTION_ID_TRANSACTIONS = 'transactions';
export const COLLECTION_ID_POSTS = 'posts';
export const COLLECTION_ID_POST_COMMENTS = 'post_comments';
export const COLLECTION_ID_CHATS = 'chats';
export const COLLECTION_ID_MESSAGES = 'messages';

export function getAppwriteStorageUrl(fileId: string) {
    if (!fileId) return '';
    // The project ID is needed to construct the URL
    const projectId = '698462e0002b93bc85d9';
    return `https://sfo.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID_UPLOADS}/files/${fileId}/view?project=${projectId}`;
}


export default client;
