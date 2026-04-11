
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * @fileOverview Master Firebase Configuration.
 * Uses provided credentials as fallback and environment variables for production.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAqIbMOCA5dOqJUy5bksBMWdvzA4kxf7JY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-1987165891-b29cf.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-1987165891-b29cf",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:787362438578:web:898cd4f13a522d8d1b58ab"
};

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
