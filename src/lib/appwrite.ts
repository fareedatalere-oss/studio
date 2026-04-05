
import { auth, db, storage as firebaseStorage } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * @fileOverview Master Firebase Engine.
 * This file replaces Appwrite with a high-performance Firebase bridge.
 * All functions mapped to Firestore and Firebase Auth.
 */

export const DATABASE_ID = 'main';
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
export const COLLECTION_ID_MEETINGS = 'meetings';

export const MEETING_BOT_ID = 'ipay_meeting_system';

// Shim for document models
export namespace Models {
  export type Document = any;
}

const mapDoc = (d: DocumentSnapshot) => {
  if (!d.exists()) throw { code: 404, message: 'Document not found' };
  const data = d.data();
  return {
    ...data,
    $id: d.id,
    $createdAt: data?.createdAt || new Date().toISOString(),
    $updatedAt: data?.updatedAt || new Date().toISOString()
  };
};

export const account = {
  create: async (id: string, email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  },
  createEmailPasswordSession: async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  },
  deleteSession: async (id: string) => {
    return signOut(auth);
  },
  get: async () => {
    return new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        if (user) resolve({ ...user, $id: user.uid });
        else reject(new Error('No active session'));
      });
    });
  },
  updateName: async (name: string) => {
    if (auth.currentUser) return updateProfile(auth.currentUser, { displayName: name });
  },
  updateEmail: async (email: string, pass: string) => {
    if (auth.currentUser) return firebaseUpdateEmail(auth.currentUser, email);
  },
  updatePassword: async (newPass: string, oldPass: string) => {
    if (auth.currentUser) return firebaseUpdatePassword(auth.currentUser, newPass);
  }
};

export const databases = {
  getDocument: async (dbId: string, collId: string, docId: string) => {
    const snap = await getDoc(doc(db, collId, docId));
    return mapDoc(snap);
  },
  createDocument: async (dbId: string, collId: string, docId: string, data: any) => {
    const finalId = (!docId || docId === 'unique()') ? ID.unique() : docId;
    const finalData = { 
        ...data, 
        createdAt: data.createdAt || new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
    };
    await setDoc(doc(db, collId, finalId), finalData);
    return { ...finalData, $id: finalId };
  },
  updateDocument: async (dbId: string, collId: string, docId: string, data: any) => {
    const finalData = { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, collId, docId), finalData);
    return { ...finalData, $id: docId };
  },
  deleteDocument: async (dbId: string, collId: string, docId: string) => {
    return deleteDoc(doc(db, collId, docId));
  },
  listDocuments: async (dbId: string, collId: string, queries: any[] = []) => {
    let q = query(collection(db, collId));
    queries.forEach(queryFn => {
      if (typeof queryFn === 'function') {
        const constraint = queryFn();
        if (constraint) q = query(q, constraint);
      }
    });
    const snap = await getDocs(q);
    return { documents: snap.docs.map(mapDoc), total: snap.size };
  }
};

export const storage = {
  createFile: async (bucketId: string, fileId: string, file: File) => {
    const finalId = (!fileId || fileId === 'unique()') ? ID.unique() : fileId;
    const storageRef = ref(firebaseStorage, `${bucketId}/${finalId}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { $id: finalId, url };
  },
  deleteFile: async (bucketId: string, fileId: string) => {
    const storageRef = ref(firebaseStorage, `${bucketId}/${fileId}`);
    return deleteObject(storageRef);
  }
};

export const Query = {
  equal: (attr: string, val: any) => () => where(attr, "==", val),
  notEqual: (attr: string, val: any) => () => where(attr, "!=", val),
  limit: (count: number) => () => limit(count),
  orderDesc: (attr: string) => () => orderBy(attr, "desc"),
  orderAsc: (attr: string) => () => orderBy(attr, "asc"),
  contains: (attr: string, val: any) => () => where(attr, "array-contains", val)
};

export const ID = {
  unique: () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
};

export function getAppwriteStorageUrl(fileId: string) {
  return fileId; 
}

export const client = {
  subscribe: (topics: string[], callback: (response: any) => void) => {
    const unsubs = topics.map(topic => {
        const parts = topic.split('.');
        const collId = parts[3];
        const docId = parts[5];
        if (docId) {
            return onSnapshot(doc(db, collId, docId), snap => snap.exists() && callback({ payload: mapDoc(snap), events: ['update'] }));
        } else {
            return onSnapshot(collection(db, collId), snap => {
                snap.docChanges().forEach(change => {
                    const type = change.type === 'added' ? 'create' : change.type === 'modified' ? 'update' : 'delete';
                    callback({ payload: mapDoc(change.doc), events: [type] });
                });
            });
        }
    });
    return () => unsubs.forEach(u => u());
  }
};

export default client;
