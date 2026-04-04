import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * @fileOverview Master Firebase Configuration.
 * Updated with live project credentials provided by the user.
 */

const firebaseConfig = {
  apiKey: "AIzaSyAqIbMOCA5dOqJUy5bksBMWdvzA4kxf7JY",
  authDomain: "studio-1987165891-b29cf.firebaseapp.com",
  projectId: "studio-1987165891-b29cf",
  storageBucket: "studio-1987165891-b29cf.firebasestorage.app",
  messagingSenderId: "787362438578",
  appId: "1:787362438578:web:898cd4f13a522d8d1b58ab"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
