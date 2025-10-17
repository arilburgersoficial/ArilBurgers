import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDjST6ZlvjzQX9K193tl6Het2JkLIIZcxs",
    authDomain: "pos-aril-burguers.firebaseapp.com",
    projectId: "pos-aril-burguers",
    storageBucket: "pos-aril-burguers.firebasestorage.app", 
    messagingSenderId: "310596279135",
    appId: "1:310596279135:web:39a02b9c558569ed9e34ea",
    measurementId: "G-98XLS2ZZW5"
};

// --- CORRECCIÓN CLAVE AQUÍ ---
// Se asegura de que Firebase solo se inicialice una vez,
// evitando el error de "app duplicada" en el entorno de desarrollo.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);