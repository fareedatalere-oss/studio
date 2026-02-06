'use client';

import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('698462e0002b93bc85d9');

export const account = new Account(client);
export const databases = new Databases(client);

// This is the correct Database ID from your screenshot.
export const DATABASE_ID = '69857be6001af003c986';

// Collection IDs
export const COLLECTION_ID_PROFILES = 'profiles';
export const COLLECTION_ID_TRANSACTIONS = 'transactions';
export const COLLECTION_ID_POSTS = 'posts';


export default client;
