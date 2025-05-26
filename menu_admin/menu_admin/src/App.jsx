import './App.css';
import { useEffect, useState, useRef } from 'react';
import Login from './authentication/login';
import { auth } from './authentication/firebase';
import InstallPWAPopup from './components/pwa_installer';
import './css/dropdown.css';
import Main_admin from './main_ad';



function App() {
  const [user, setUser] = useState(null);

  // ✅ Firebase auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((loggedInUser) => {
      setUser(loggedInUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Sign out
  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="root">
      {user ? (
        <>
          <div>
            <h2 className="headingStyle">Welcome, {user?.displayName || "User"}</h2>
            <Main_admin/>
            <button className="signout" onClick={handleSignOut}>Sign out</button>
          </div>
        </>
      ) : (
        <div>
          <h1>Menu Rating</h1>
          <Login />
        </div>
      )}

      <InstallPWAPopup />
    </div>
  );
}

export default App;
