'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';


interface UseDocResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useDoc<T extends DocumentData>(
  ref: DocumentReference | null
): UseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // We use state to keep a stable reference to the document object.
  // This prevents re-subscribing on every render if the parent component
  // doesn't memoize the `DocumentReference`.
  const [stableRef, setStableRef] = useState(ref);

  useEffect(() => {
    // This effect synchronizes the incoming `ref` prop with our stable internal state.
    if (ref === null) {
      if (stableRef !== null) setStableRef(null);
      return;
    }
    // We only update our internal state if the new ref is for a different document.
    // We compare paths for safety, which is sufficient for this app's use cases.
    if (stableRef && stableRef.path === ref.path) {
      return;
    }
    setStableRef(ref);
  }, [ref, stableRef]);


  useEffect(() => {
    // This effect manages the Firestore subscription.
    // It only depends on our `stableRef`, so it won't run unnecessarily.
    if (!stableRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      stableRef,
      (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: stableRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or when the ref changes.
    return () => unsubscribe();
  }, [stableRef]);

  return { data, loading, error };
}
