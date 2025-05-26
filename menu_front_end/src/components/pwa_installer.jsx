import React, { useEffect, useState } from 'react';

const InstallPWAPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // Prevent the default mini-infobar
      console.log('PWA install is available');
      setVisible(true);

      // Auto-hide after 10 seconds
      setTimeout(() => setVisible(false), 10000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 10000,
      textAlign: 'center',
      maxWidth: '90%',
    }}>
      <span style={{ marginRight: 10 }}>This app can be installed from your browser menu.</span>
      <button onClick={() => setVisible(false)} style={{
        background: 'transparent',
        border: 'none',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '16px',
      }}>×</button>
    </div>
  );
};

export default InstallPWAPopup;
