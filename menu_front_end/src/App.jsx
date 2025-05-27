import './App.css';
import DropdownList from './components/dropdown';
import { useEffect, useState } from 'react';
import Login from './authentication/login';
import { auth } from './authentication/firebase';
import InstallPWAPopup from './components/pwa_installer';

// 🧠 Utility: Set default open meal based on time
const getInitialVisibility = () => {
  const hour = new Date().getHours();
  const new_show = Array(4).fill(0);

  if (hour >= 8 && hour < 12) new_show[0] = 1; // Breakfast
  else if (hour >= 12 && hour < 15) new_show[1] = 1; // Lunch
  else if (hour >= 15 && hour < 18) new_show[2] = 1; // Snacks
  else if (hour >= 18 && hour < 24) new_show[3] = 1; // Dinner

  return new_show;
};

// ✅ This will print logs directly on screen (for mobile debugging)
console.log = function (msg) {
  const existing = document.getElementById('log');
  if (existing) existing.innerText += '\n' + msg;
  else {
    const div = document.createElement('div');
    div.id = 'log';
    div.style = 'white-space: pre; background: #000; color: #0f0; padding: 10px;';
    div.innerText = msg;
    document.body.appendChild(div);
  }
};

function App() {
  const [show, setShow] = useState(getInitialVisibility);
  const [user, setUser] = useState(null);

  // Firebase Auth listener
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
useEffect(() => {
  let intervalId;

  const showNotification = async () => {
      if (Notification.permission !== 'granted') {
        console.log('❌ Notification permission not granted');
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const now = new Date().toLocaleTimeString();
        registration.showNotification('📱 Current Time', {
          body: `It's now ${now}`,
          icon: '/icon-192x192.png',
          tag: 'time-update',
          renotify: true
        });
      } else {
        console.log('❌ No service worker registration found');
      }
    };

    const startInterval = async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        intervalId = setInterval(showNotification, 10000); // every 10 seconds
      } else {
        console.log('❌ Notification permission denied');
      }
    };

    startInterval();

    return () => {
      clearInterval(intervalId);
    };
  }, []);
  return (
    <div className="root">
      {user ? (
        <>
          <h2 className="headingStyle">Welcome, {user?.displayName || "User"}</h2>
          <DropdownList
            visibility={show}
            setVisibility={setShow}
            name={user?.displayName || "User"}
          />
          <button className="signout" onClick={handleSignOut}>Sign out</button>
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
