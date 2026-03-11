
'use client';

/**
 * @fileOverview Bridge to standard Firebase instances.
 * This file is maintained for backward compatibility with existing components.
 */

import { initializeFirebase } from '@/firebase';

const { auth, firestore: db } = initializeFirebase();

export { auth, db };
