'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export function initializeFirebase(): {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
} {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  const firestore = getApps().length > 0 
    ? getFirestore(app) 
    : initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });

  const auth = getAuth(app);
  const storage = getStorage(app);

  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Failed to set auth persistence:", err);
  });

  return { app, firestore, auth, storage };
}

export * from './provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
