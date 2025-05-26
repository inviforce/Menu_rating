import React, { useEffect, useState } from 'react';

const InstallPWAPopup = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent the default mini-infobar
      setDeferredPrompt(e); // Save the event for later
      setVisible(true); // Show our custom popup
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // Show browser install prompt

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setVisible(false); // Hide custom popup
  };

  const handleCancel = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 8,
        textAlign: 'center',
        minWidth: 300,
      }}>
        <p>Install this app on your device?</p>
        <div style={{ marginTop: 10 }}>
          <button onClick={handleInstall} style={{
            marginRight: 10,
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}>
            Install
          </button>
          <button onClick={handleCancel} style={{
            padding: '6px 12px',
            backgroundColor: '#ccc',
            color: '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPWAPopup;
