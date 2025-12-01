import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyAeNAjnv8u7ya6uVUHld0EM9rlJs81yQtA",
  authDomain: "familyguard-2c198.firebaseapp.com",
  projectId: "familyguard-2c198",
  storageBucket: "familyguard-2c198.firebasestorage.app",
  messagingSenderId: "675930277211",
  appId: "1:675930277211:web:4fa74ba3f40b1ebd9ac67e",
  measurementId: "G-XE6QEXERN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper function to generate pairing code
export const generatePairingCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to create pairing code in Firestore
export const createPairingCode = async (parentId: string, childName: string) => {
  const code = generatePairingCode();
  try {
    if (!parentId) {
      throw new Error('No parentId provided (user not authenticated?)');
    }
    if (!childName.trim()) {
      throw new Error('Child name required');
    }

    // Log intent for debugging in dev tools
    console.info('[Pairing] Creating code', { parentId, childName, code });

    await addDoc(collection(db, 'pairingCodes'), {
      code,
      parentId,
      childName,
      isUsed: false,
      createdAt: serverTimestamp()
    });

    console.info('[Pairing] Code created successfully');
    return code;
  } catch (err: any) {
    let message = 'Failed to create pairing code';
    if (err instanceof FirebaseError) {
      if (err.code === 'permission-denied') {
        message += ': Firestore permission-denied. Verify security rules allow authenticated create on /pairingCodes and parentId matches auth.uid.';
      } else if (err.code === 'unavailable') {
        message += ': Firestore temporarily unavailable.';
      } else {
        message += `: (${err.code}) ${err.message}`;
      }
    } else if (err?.message) {
      message += `: ${err.message}`;
    }
    console.error('[Pairing] Error creating code', err);
    const e = new Error(message);
    (e as any).original = err;
    throw e;
  }
};