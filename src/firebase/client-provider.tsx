'use client';

import React from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

// Initialize Firebase on the client
const firebaseInstance = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseProvider value={firebaseInstance}>{children}</FirebaseProvider>;
}
