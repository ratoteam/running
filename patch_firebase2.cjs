const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBz_RpqzU2r-3ayNyiGH1_Gk5ssd2semR8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rtrunninglist.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://rtrunninglist-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rtrunninglist",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rtrunninglist.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "603183865625",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:603183865625:web:d0f6e40b1bd76e2a47af88",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-V2XPZJ0EQ1"
};`;

const replace = `const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};`;

content = content.replace(target, replace);
fs.writeFileSync('src/lib/firebase.ts', content);
