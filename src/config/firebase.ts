import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  
  await addDoc(collection(db, 'pairingCodes'), {
    code,
    parentId,
    childName,
    isUsed: false,
    createdAt: serverTimestamp()
  });
  
  return code;
};