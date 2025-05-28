import './App.css';
import { useEffect, useState } from 'react';
import Login from './authentication/login';
import { auth } from './authentication/firebase';
import InstallPWAPopup from './components/pwa_installer';
import './css/dropdown.css';
import Main_admin from './main_ad';
import Sec_app from './sec_app';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('review'); // 'upload' or 'review'

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

  return (
    <div className="root">
      {user ? (
        <div className="user-panel">
          <h2 className="headingStyle">Welcome, {user?.displayName || "User"}</h2>

          <div className="button-group">
            <button onClick={() => setView('upload')}>Upload Menu</button>
            <button onClick={() => setView('review')}>See Review</button>
          </div>

          <div className="content">
            {view === 'upload' && <Sec_app />}
            {view === 'review' && <Main_admin />}
          </div>

          <button className="signout" onClick={handleSignOut}>Sign out</button>
        </div>
      ) : (
        <div className="login-panel">
          <h1>Menu Rating</h1>
          <Login />
          <button className="signout" onClick={handleSignOut}>Sign out</button>
        </div>
      )}

      <InstallPWAPopup />
    </div>
  );
}

export default App;
