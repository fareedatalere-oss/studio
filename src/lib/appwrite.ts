import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sfo.cloud.appwrite.io/v1')
    .setProject('698462e0002b93bc85d9');

export const account = new Account(client);
export const databases = new Databases(client, 'i-pay-db');

export default client;
