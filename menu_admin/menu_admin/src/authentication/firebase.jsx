import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAmacVQMKdZZRxgC9rKHX-LHN96L7BiSbA",
  authDomain: "some-23fc5.firebaseapp.com",
  projectId: "some-23fc5",
  storageBucket: "some-23fc5.firebasestorage.app",
  messagingSenderId: "683772900348",
  appId: "1:683772900348:web:8ac72d98c27e0bf3f6f879",
  measurementId: "G-7HQ641M1DQ"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// This ensures the user is always prompted to select an account
provider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, provider, signInWithPopup, signOut };
