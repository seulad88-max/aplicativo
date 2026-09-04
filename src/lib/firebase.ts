// Configuração do Firebase do projeto "fluxo-prime".
// A apiKey do Firebase Web é pública por natureza (fica no código do site).
// A proteção real vem das regras do Firestore (firestore.rules) e dos
// domínios autorizados em Authentication → Settings.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
} from "firebase/auth";
// A versão "lite" usa requisições diretas e devolve erros de configuração
// imediatamente, em vez de deixar escritas pendentes tentando reconectar.
import { getFirestore, type Firestore } from "firebase/firestore/lite";

// A chave do Firebase Web é pública por natureza (fica no código do site).
export const FIREBASE_API_KEY = "AIzaSyDsynq5tRrzDeh2Uqnv2RXXZbcRFFyeSns";

export const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "fluxo-prime.firebaseapp.com",
  projectId: "fluxo-prime",
  storageBucket: "fluxo-prime.firebasestorage.app",
  messagingSenderId: "823021918648",
  appId: "1:823021918648:web:7060d7aa2324a82560574d",
  measurementId: "G-K7XNWKDXBJ",
};

let appRef: FirebaseApp | null = null;
let authRef: Auth | null = null;
let dbRef: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appRef) appRef = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appRef;
}

export function getFirebaseAuth(): Auth {
  if (!authRef) {
    authRef = getAuth(getFirebaseApp());
    void setPersistence(authRef, browserLocalPersistence).catch(() => undefined);
  }
  return authRef;
}

export function getDb(): Firestore {
  if (!dbRef) dbRef = getFirestore(getFirebaseApp());
  return dbRef;
}

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");
