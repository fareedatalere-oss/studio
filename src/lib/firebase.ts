
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

/**
 * @fileOverview Master Firebase Configuration.
 * UPDATED with Messaging support for Native Pushes.
 */

const firebaseConfig = {
  apiKey: "AIzaSyAqIbMOCA5dOqJUy5bksBMWdvzA4kxf7JY",
  authDomain: "studio-1987165891-b29cf.firebaseapp.com",
  projectId: "studio-1987165891-b29cf",
  storageBucket: "studio-1987165891-b29cf.firebasestorage.app",
  messagingSenderId: "787362438578",
  appId: "1:787362438578:web:898cd4f13a522d8d1b58ab"
};

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// Messaging is only supported in browser environments
const messaging = typeof window !== 'undefined' ? async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
} : async () => null;

export { app, auth, db, messaging };
