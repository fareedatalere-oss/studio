import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('698462e0002b93bc85d9');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = '69857be6001af003c986';
export const BUCKET_ID_UPLOADS = 'uploads';

export const COLLECTION_ID_PROFILES = 'profiles';
export const COLLECTION_ID_TRANSACTIONS = 'transactions';
export const COLLECTION_ID_POSTS = 'posts';
export const COLLECTION_ID_POST_COMMENTS = 'postComments';
export const COLLECTION_ID_CHATS = 'chats';
export const COLLECTION_ID_MESSAGES = 'messages';
export const COLLECTION_ID_APPS = 'apps';
export const COLLECTION_ID_PRODUCTS = 'products';
export const COLLECTION_ID_BOOKS = 'books';
export const COLLECTION_ID_UPWORK_PROFILES = 'upworkProfiles';
export const COLLECTION_ID_APP_CONFIG = 'app_config';
export const COLLECTION_ID_NOTIFICATIONS = 'notifications';

export function getAppwriteStorageUrl(fileId: string) {
    if (!fileId) return '';
    const projectId = '698462e0002b93bc85d9';
    return `https://sfo.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID_UPLOADS}/files/${fileId}/view?project=${projectId}`;
}

export { client };
export default client;
