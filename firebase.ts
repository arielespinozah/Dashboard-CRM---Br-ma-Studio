import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQbBx1y418ZBLS_lxB_agC6KUHU-e85P8",
  authDomain: "crm-brama-studio.firebaseapp.com",
  projectId: "crm-brama-studio",
  storageBucket: "crm-brama-studio.firebasestorage.app",
  messagingSenderId: "998429015876",
  appId: "1:998429015876:web:ac1c5004a8de570507e111",
  measurementId: "G-12KTEWDBJD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };