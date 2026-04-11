
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * @fileOverview Master Firebase Configuration.
 * Uses environment variables for security.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Fail-safe initialization for local development
const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(isConfigured ? firebaseConfig : {
      apiKey: "AIzaSyAqIbMOCA5dOqJUy5bksBMWdvzA4kxf7JY",
      authDomain: "studio-1987165891-b29cf.firebaseapp.com",
      projectId: "studio-1987165891-b29cf",
      appId: "1:787362438578:web:898cd4f13a522d8d1b58ab"
    });

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
