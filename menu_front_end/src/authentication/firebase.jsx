import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBPendkWM0LrYFYnruyqdOwe5-60MdRE7Q",
  authDomain: "menu-4a32c.firebaseapp.com",
  projectId: "menu-4a32c",
  storageBucket: "menu-4a32c.firebasestorage.app",
  messagingSenderId: "491840054429",
  appId: "1:491840054429:web:42bfa07787881520a42074"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// This ensures the user is always prompted to select an account
provider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, provider, signInWithPopup, signOut };
