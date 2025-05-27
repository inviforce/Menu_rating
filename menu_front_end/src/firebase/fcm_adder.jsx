async function deleteDocument(docName, firebaseConfig) {
  const url = `https://firestore.googleapis.com/v1/${docName}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, { method: 'DELETE' });

  if (!res.ok) {
    throw new Error(`Failed to delete document ${docName}: ${res.statusText}`);
  }
}

export default async function RegisterFCMToken(receivedData, firebaseConfig) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Firebase config with projectId and apiKey is required');
  }

  if (!receivedData?.name || !receivedData?.token) {
    throw new Error('Received data must include name and token');
  }

  const { name, token } = receivedData;

  // Step 1: Query all existing documents for this user name
  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: 'menu_notification' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: name },
        },
      },
    },
  };

  const queryUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`;
  const queryRes = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryPayload),
  });

  if (!queryRes.ok) {
    throw new Error(`Firestore query failed: ${queryRes.statusText}`);
  }

  const queryResult = await queryRes.json();

  // Step 2: Delete all documents with the same user name
  for (const entry of queryResult) {
    const docName = entry.document?.name;
    if (docName) {
      await deleteDocument(docName, firebaseConfig);
    }
  }

  // Step 3: Add new token document
  const firestoreFormattedData = {
    fields: {
      name: { stringValue: name },
      token: { stringValue: token },
      timestamp: { timestampValue: new Date().toISOString() },
    },
  };

  const postUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/menu_notification?key=${firebaseConfig.apiKey}`;
  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firestoreFormattedData),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`Failed to add new document: ${errText}`);
  }

  const postResponseData = await postRes.json();

  return {
    message: 'Previous token(s) deleted and new token registered',
    response: postResponseData,
  };
}
