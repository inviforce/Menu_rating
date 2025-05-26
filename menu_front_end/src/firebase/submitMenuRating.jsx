async function deleteDocument(docName, firebaseConfig) {
  const url = `https://firestore.googleapis.com/v1/${docName}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Failed to delete document ${docName}: ${res.statusText}`);
  }
  
}

export default async function submitMenuRating(receivedData, firebaseConfig) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Firebase config with projectId and apiKey is required');
  }
  if (!receivedData?.name || !receivedData?.type) {
    throw new Error('Received data must include name and type');
  }

  const firestoreFormattedData = {
    fields: {
      ratings: {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(receivedData)
              .filter(([_, v]) => typeof v === 'number')
              .map(([k, v]) => [k, { integerValue: v }])
          ),
        },
      },
      type: { stringValue: receivedData.type },
      name: { stringValue: receivedData.name },
      timestamp: { timestampValue: new Date().toISOString() },
    },
  };

  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'name' },
                op: 'EQUAL',
                value: { stringValue: receivedData.name },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'type' },
                op: 'EQUAL',
                value: { stringValue: receivedData.type },
              },
            },
          ],
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

  // Compare dates in local time (no UTC methods used)
  const now = new Date();
  const serverYear = now.getFullYear();
  const serverMonth = now.getMonth();
  const serverDate = now.getDate();

  const matchingDocs = queryResult.filter((entry) => {
    const timestampStr = entry.document?.fields?.timestamp?.timestampValue;
    if (!timestampStr) return false;

    const firebaseDate = new Date(timestampStr);
    return (
      firebaseDate.getFullYear() === serverYear &&
      firebaseDate.getMonth() === serverMonth &&
      firebaseDate.getDate() === serverDate
    );
  });

  for (const doc of matchingDocs) {
    const docName = doc.document.name;
    //console.log("a docuemtn is being dleted",docName)
    await deleteDocument(docName, firebaseConfig);
  }

  const postUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/menu_rating?key=${firebaseConfig.apiKey}`;
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
    message: `New document added${matchingDocs.length > 0 ? ' after deleting previous document(s)' : ''}`,
    response: postResponseData,
  };
}
