import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const InstallPWAPopup = forwardRef((props, ref) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      if (deferredPrompt) setVisible(true);
      else alert('PWA install not available');
    }
  }));

  const handleInstallClick = () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      setVisible(false);
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    });
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
        <button onClick={handleInstallClick}>Install</button>
        <button onClick={() => setVisible(false)} style={{ marginLeft: 10 }}>Cancel</button>
      </div>
    </div>
  );
});

export default InstallPWAPopup;
