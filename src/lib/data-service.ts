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
  increment,
  arrayUnion
} from 'firebase/firestore';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

/**
 * @fileOverview Master Firebase Data Service.
 * Consolidated for high performance using Profiles collection and Cloudinary.
 * SHIELDED: Robust timestamp mapping to prevent Vercel crashes.
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
    
    // SHIELDED MAPPING: Ensure createdAt/updatedAt never trigger null property crashes
    const safeCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());
    const safeUpdatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString());

    return {
        $id: snapshot.id,
        uid: snapshot.id,
        ...data,
        $createdAt: safeCreatedAt,
        $updatedAt: safeUpdatedAt,
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
            documents: res.docs.map(mapDoc).filter(Boolean)
        };
    },
    createDocument: async (dbId: string, collId: string, docId: string, data: any) => {
        const id = docId === 'unique()' || docId === 'unique' ? doc(collection(db, collId)).id : docId;
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
    },
    client: {
        subscribe: (channels: string | string[], callback: Function) => {
            if (typeof window === 'undefined') return () => {};
            const chans = Array.isArray(channels) ? channels : [channels];
            
            const unsubs = chans.map(chan => {
                if (typeof chan !== 'string') return null;
                const parts = chan.split('.');
                let collId = '';
                const collIndex = parts.indexOf('collections');
                if (collIndex !== -1 && parts[collIndex + 1]) {
                    collId = parts[collIndex + 1];
                } else {
                    collId = parts[2] || parts[1];
                }

                if (!collId || collId === 'documents') return null;

                return onSnapshot(collection(db, collId), (snapshot) => {
                    snapshot.docChanges().forEach(change => {
                        callback({
                            events: [`collections.${collId}.documents.${change.type}`],
                            payload: mapDoc(change.doc)
                        });
                    });
                });
            });

            return () => unsubs.forEach(unsub => typeof unsub === 'function' && unsub());
        }
    }
};

export const client = databases.client;

export const storage = {
    createFile: async (bucketId: string, fileId: string, file: File) => {
        if (typeof window === 'undefined') return { $id: 'server-stub', url: '' };
        const reader = new FileReader();
        const base64: string = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const res = await uploadToCloudinary(base64, file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') || file.type.startsWith('audio') ? 'video' : 'auto'));
        if (res.success) return { $id: res.publicId, url: res.url };
        else throw new Error(res.message || 'Cloudinary upload failed.');
    },
    deleteFile: async (bucketId: string, fileId: string) => {}
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

export const ID = { unique: () => 'unique' };

export const Query = {
    equal: (field: string, value: any) => ({ type: 'equal', field, value }),
    limit: (n: number) => ({ type: 'limit', value: n }),
    orderDesc: (field: string) => ({ type: 'orderDesc', field }),
    orderAsc: (field: string) => ({ type: 'orderAsc', field }),
    contains: (field: string, value: any) => ({ type: 'contains', field, value }),
    notEqual: (field: string, value: any) => ({ type: 'notEqual', field, value }),
};

export { auth, db, increment, arrayUnion };
