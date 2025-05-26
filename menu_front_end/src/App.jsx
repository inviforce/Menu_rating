import './App.css';
import HeaderCommon from './components/header_common';
import DropdownList from './components/dropdown';
import { useEffect, useState, useRef } from 'react';
import Login from './authentication/login';
import { auth } from './authentication/firebase';
import InstallPWAPopup from './components/pwa_installer';

// ✅ Time-based visibility logic initialized BEFORE first render
const getInitialVisibility = () => {
  const hour = new Date().getHours();
  const new_show = Array(4).fill(0);

  if (hour >= 6 && hour < 12) {
    new_show[0] = 1; // Breakfast
  } else if (hour >= 12 && hour < 15) {
    new_show[1] = 1; // Lunch
  } else if (hour >= 15 && hour < 18) {
    new_show[2] = 1; // Snacks
  } else if (hour >= 18 && hour < 24) {
    new_show[3] = 1; // Dinner
  }

  return new_show;
};

function App() {
  const [show, setShow] = useState(getInitialVisibility);
  const [user, setUser] = useState(null);
  const pwaPopupRef = useRef();

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
            <DropdownList
              visibility={show}
              setVisibility={setShow}
              name={user?.displayName || "User"}
            />
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
