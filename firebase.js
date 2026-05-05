import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDhUbx0f4eNrK2eKfWRc26vWBapn90DXhc",
  authDomain: "ficha-rpg-afd92.firebaseapp.com",
  projectId: "ficha-rpg-afd92",
  storageBucket: "ficha-rpg-afd92.firebasestorage.app",
  messagingSenderId: "839004102060",
  appId: "1:839004102060:web:53b94535fe26c2266d2e09"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

// Inicializar Authentication
export const auth = getAuth(app);

// Fazer login anônimo automaticamente
signInAnonymously(auth).catch((error) => {
  console.error("Erro ao fazer login anônimo:", error);
});
