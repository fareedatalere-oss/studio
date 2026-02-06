import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('698462e0002b93bc85d9');

export const account = new Account(client);
// For Appwrite SDK v14+, the database ID is passed to methods, not the constructor.
export const databases = new Databases(client);

// Per your instruction, the database name/ID is 'profiles'.
export const DATABASE_ID = 'profiles';

// Collection IDs
export const COLLECTION_ID_PROFILES = 'profiles';
export const COLLECTION_ID_TRANSACTIONS = 'transactions';
export const COLLECTION_ID_POSTS = 'posts';


export default client;
