import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, message } = req.body;

  try {
    const response = await admin.messaging().send({
      token,
      notification: {
        title: '⚠️ Task Reminder',
        body: message || 'You haven’t completed your task yet!',
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
        },
      },
    });
    return res.status(200).json({ success: true, response });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
