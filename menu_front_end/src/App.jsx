import './App.css';
import DropdownList from './components/dropdown';
import { useEffect, useState } from 'react';
import Login from './authentication/login';
import { auth, messaging, getToken, onMessage } from './authentication/firebase';
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

function NotificationPermissionPopup({ onClose, onAllow }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fff',
      padding: '15px 25px',
      boxShadow: '0 0 10px rgba(0,0,0,0.2)',
      borderRadius: '8px',
      zIndex: 1000,
      maxWidth: '90%',
      textAlign: 'center',
    }}>
      <p style={{ margin: '0 0 10px' }}>Enable notifications to stay updated!</p>
      <button onClick={onAllow} style={{ marginRight: 10, padding: '6px 12px' }}>Allow Notifications</button>
      <button onClick={onClose} style={{ padding: '6px 12px' }}>Maybe Later</button>
    </div>
  );
}

function App() {
  const [show, setShow] = useState(getInitialVisibility);
  const [user, setUser] = useState(null);
  const [showNotifPopup, setShowNotifPopup] = useState(false);

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
    // Show popup only if notification permission is default (not granted or denied)
    if (Notification.permission === 'default') {
      setShowNotifPopup(true);
    }
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowNotifPopup(false);

        const token = await getToken(messaging, {
          vapidKey: 'BIcwXrGSZZz57IoAEEDVB2oCPpyaDV7hz2bIfMn0gpcDuVVGO4s2IIlncVZ6yqtShc9bxgV5Ma5AEpuKoRwff4I',
        });
        console.log('✅ FCM Token:', token);

        // Send token to backend API
        await fetch('/api/notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } else {
        console.warn('❌ Notification permission not granted');
        setShowNotifPopup(false);
      }
    } catch (err) {
      console.error('❌ Error getting FCM token', err);
      setShowNotifPopup(false);
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then(() => console.log('✅ Service Worker Registered'))
        .catch(err => console.error('❌ SW registration error', err));
    }

    // If permission already granted, initialize messaging directly
    if (Notification.permission === 'granted') {
      (async () => {
        try {
          const token = await getToken(messaging, {
            vapidKey: 'BIcwXrGSZZz57IoAEEDVB2oCPpyaDV7hz2bIfMn0gpcDuVVGO4s2IIlncVZ6yqtShc9bxgV5Ma5AEpuKoRwff4I',
          });
          console.log('✅ FCM Token:', token);

          await fetch('/api/notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        } catch (err) {
          console.error('❌ Error getting FCM token', err);
        }
      })();
    }

    onMessage(messaging, payload => {
      console.log('📩 Foreground message:', payload);
      const { title, body } = payload.notification;
      navigator.serviceWorker.getRegistration().then(reg => {
        reg?.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
        });
      });
    });
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

      {showNotifPopup && (
        <NotificationPermissionPopup
          onClose={() => setShowNotifPopup(false)}
          onAllow={requestNotificationPermission}
        />
      )}

      <InstallPWAPopup />
    </div>
  );
}

export default App;
