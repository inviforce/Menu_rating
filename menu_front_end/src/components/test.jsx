import React from 'react';

export default function App_1() {
  function sendTestNotification() {
    if (Notification.permission === 'granted') {
      new Notification('Hi!', {
        body: 'This is a test notification.',
        icon: '/firebase-logo.png'
      });
    } else {
      console.log('Notification permission not granted');
    }
  }

  return (
    <div>
      <h1>Notification Test</h1>
      <button onClick={sendTestNotification}>Send Test Notification</button>
    </div>
  );
}
