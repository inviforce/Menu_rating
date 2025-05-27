import './App.css';
import DropdownList from './components/dropdown';
import { useEffect, useState } from 'react';
import Login from './authentication/login';
import { auth, messaging, getToken, onMessage } from './authentication/firebase';
import InstallPWAPopup from './components/pwa_installer';
import RegisterFCMToken from './firebase/fcm_adder';

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

function App() {
  const [show, setShow] = useState(getInitialVisibility);
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);

  

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
      addLog("Error signing out: " + error.message);
    }
  };

  useEffect(() => {
    if (!user) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then(() => addLog('✅ Service Worker Registered'))
        .catch(err => addLog('❌ SW registration error: ' + err.message));
    }

    const setupFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          addLog('🔕 Notification permission not granted');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: 'BIcwXrGSZZz57IoAEEDVB2oCPpyaDV7hz2bIfMn0gpcDuVVGO4s2IIlncVZ6yqtShc9bxgV5Ma5AEpuKoRwff4I',
        });
        const name = user.displayName || 'User';

        addLog('✅ FCM Token: ' + token);
        addLog('👤 User name: ' + name);

        const firebaseConfig = {
          apiKey: "AIzaSyAmacVQMKdZZRxgC9rKHX-LHN96L7BiSbA",
          authDomain: "some-23fc5.firebaseapp.com",
          projectId: "some-23fc5",
          storageBucket: "some-23fc5.firebasestorage.app",
          messagingSenderId: "683772900348",
          appId: "1:683772900348:web:8ac72d98c27e0bf3f6f879",
          measurementId: "G-7HQ641M1DQ"
        };

        try {
          const response = await RegisterFCMToken({ name, token }, firebaseConfig);
          addLog('📬 FCM Registration Result: ' + response.message);
        } catch (err) {
          addLog('❌ Error registering FCM token: ' + err.message);
        }

      } catch (err) {
        addLog('❌ Error getting FCM token: ' + err.message);
      }
    };

    setupFCM();

    onMessage(messaging, payload => {
      addLog('📩 Foreground message: ' + JSON.stringify(payload));
      const { title, body } = payload.notification;
      navigator.serviceWorker.getRegistration().then(reg => {
        reg?.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
        });
      });
    });
  }, [user]);

  return (
    <>
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
    </>
  );
}

export default App;
