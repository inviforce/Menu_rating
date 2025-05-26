import './App.css';
import HeaderCommon from './components/header_common';
import DropdownList from './components/dropdown';
import { useEffect, useState, useRef } from 'react';
import Login from './authentication/login'; 
import { auth } from './authentication/firebase'; 
import InstallPWAPopup from './components/pwa_installer';  // <-- import here

function App() {
  const [show, setShow] = useState(Array(4).fill(0));
  const pwaPopupRef = useRef();

  useEffect(() => {
    const hour = new Date().getHours();
    const new_show = Array(4).fill(0);

    if (hour >= 6 && hour < 12) {
      new_show[0] = 1;
    } else if (hour >= 12 && hour < 15) {
      new_show[1] = 1;
    } else if (hour >= 15 && hour < 18) {
      new_show[2] = 1;
    } else if (hour >= 18 && hour < 24) {
      new_show[3] = 1;
    }

    setShow(new_show);
  }, []);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((loggedInUser) => {
      setUser(loggedInUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Function to open PWA install popup


  return (
    <div className="root">
      {user ? (
        <>
          <div>
            <h2 className="headingStyle">Welcome, {user?.displayName || "User"}</h2>
            {/* Only render DropdownList once show is initialized */}
            {show.some(val => val === 1) && (
              <DropdownList visibility={show} setVisibility={setShow} name={user?.displayName || "User"} />
            )}
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
