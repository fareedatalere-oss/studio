
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  orderBy, 
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

/**
 * @fileOverview Master Firebase Bridge.
 * REDIRECTED: storage.createFile now uses Cloudinary exclusively to remove Firebase Storage dependency.
 */

export const DATABASE_ID = 'default';
export const COLLECTION_ID_PROFILES = 'profiles';
export const COLLECTION_ID_APP_CONFIG = 'app_config';
export const COLLECTION_ID_TRANSACTIONS = 'transactions';
export const COLLECTION_ID_POSTS = 'posts';
export const COLLECTION_ID_CHATS = 'chats';
export const COLLECTION_ID_MESSAGES = 'messages';
export const COLLECTION_ID_NOTIFICATIONS = 'notifications';
export const COLLECTION_ID_APPS = 'apps';
export const COLLECTION_ID_PRODUCTS = 'products';
export const COLLECTION_ID_BOOKS = 'books';
export const COLLECTION_ID_UPWORK_PROFILES = 'upworkProfiles';
export const COLLECTION_ID_POST_COMMENTS = 'postComments';
export const COLLECTION_ID_MEETINGS = 'meetings';
export const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

/**
 * Strips 'undefined' fields from objects to prevent Firestore setDoc errors.
 */
const sanitize = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

const mapDoc = (snapshot: any) => {
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
        $id: snapshot.id,
        uid: snapshot.id,
        ...data,
        $createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        $updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };
};

export const databases = {
    getDocument: async (dbId: string, collId: string, docId: string) => {
        const d = await getDoc(doc(db, collId, docId));
        if (!d.exists()) throw { code: 404, message: 'Not found' };
        return mapDoc(d);
    },
    listDocuments: async (dbId: string, collId: string, queries: any[] = []) => {
        let q = query(collection(db, collId));
        
        queries.forEach(qr => {
            if (qr.type === 'equal') q = query(q, where(qr.field, '==', qr.value));
            if (qr.type === 'notEqual') q = query(q, where(qr.field, '!=', qr.value));
            if (qr.type === 'contains') q = query(q, where(qr.field, 'array-contains', qr.value));
            if (qr.type === 'limit') q = query(q, limit(qr.value));
            if (qr.type === 'orderDesc') q = query(q, orderBy(qr.field === '$createdAt' ? 'createdAt' : qr.field, 'desc'));
            if (qr.type === 'orderAsc') q = query(q, orderBy(qr.field === '$createdAt' ? 'createdAt' : qr.field, 'asc'));
        });

        const res = await getDocs(q);
        return {
            total: res.size,
            documents: res.docs.map(mapDoc)
        };
    },
    createDocument: async (dbId: string, collId: string, docId: string, data: any) => {
        const id = docId === 'unique()' ? doc(collection(db, collId)).id : docId;
        const clean = sanitize(data);
        const d = { ...clean, createdAt: serverTimestamp() };
        await setDoc(doc(db, collId, id), d);
        return { $id: id, uid: id, ...d };
    },
    updateDocument: async (dbId: string, collId: string, docId: string, data: any) => {
        const clean = sanitize(data);
        const d = { ...clean, updatedAt: serverTimestamp() };
        await updateDoc(doc(db, collId, docId), d);
        return { $id: docId };
    },
    deleteDocument: async (dbId: string, collId: string, docId: string) => {
        await deleteDoc(doc(db, collId, docId));
    }
};

export const storage = {
    /**
     * Redirected to Cloudinary to avoid Firebase Storage dependency.
     */
    createFile: async (bucketId: string, fileId: string, file: File) => {
        const reader = new FileReader();
        const base64: string = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });

        const res = await uploadToCloudinary(base64, file.type.startsWith('image') ? 'image' : 'auto');
        if (res.success) {
            return { $id: res.publicId, url: res.url };
        } else {
            throw new Error(res.message || 'Cloudinary upload failed.');
        }
    },
    deleteFile: async (bucketId: string, fileId: string) => {
        // Deletion from Cloudinary requires separate logic, usually skipped for prototypes.
        console.log("Delete request for Cloudinary ID:", fileId);
    }
};

export const account = {
    get: async () => {
        return new Promise((resolve, reject) => {
            const unsub = onAuthStateChanged(auth, (u) => {
                unsub();
                if (u) resolve({ $id: u.uid, uid: u.uid, email: u.email, name: u.displayName });
                else reject({ code: 401 });
            });
        });
    },
    createEmailPasswordSession: (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass),
    create: (id: string, email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass),
    deleteSession: (id: string) => signOut(auth),
    updateName: (name: string) => updateProfile(auth.currentUser!, { displayName: name }),
};

export const ID = {
    unique: () => 'unique()'
};

export const Query = {
    equal: (field: string, value: any) => ({ type: 'equal', field, value }),
    limit: (n: number) => ({ type: 'limit', value: n }),
    orderDesc: (field: string) => ({ type: 'orderDesc', field }),
    orderAsc: (field: string) => ({ type: 'orderAsc', field }),
    contains: (field: string, value: any) => ({ type: 'contains', field, value }),
    notEqual: (field: string, value: any) => ({ type: 'notEqual', field, value }),
};

export const client = {
    subscribe: (channels: string[], callback: Function) => {
        const unsubs = channels.map(chan => {
            const parts = chan.split('.');
            const collId = parts[parts.length - 2] || parts[parts.length - 1]; 
            if (!collId || collId === 'documents') return () => {};
            return onSnapshot(collection(db, collId), (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    callback({
                        events: [`collections.${collId}.documents.${change.type}`],
                        payload: mapDoc(change.doc)
                    });
                });
            });
        });
        return () => unsubs.forEach(u => u());
    }
};

export function getAppwriteStorageUrl(fileId: string) {
  return fileId; 
}

export { auth, db, increment };
export default client;
