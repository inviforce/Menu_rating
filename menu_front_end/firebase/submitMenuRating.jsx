import https from 'https';

const IST_OFFSET = 330; // IST in minutes

function formatDateIST(date) {
  return new Date(date.getTime() + IST_OFFSET * 60000);
}

function makeHttpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

export default async function submitMenuRating(receivedData, firebaseConfig) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Firebase config with projectId and apiKey is required');
  }

  if (!receivedData?.name || !receivedData?.type) {
    throw new Error('Received data must include name and type');
  }

  // Prepare Firestore formatted data
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

  // Firestore query to find existing docs with same name and type
  const queryPayload = JSON.stringify({
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
  });

  const queryOptions = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(queryPayload),
    },
  };

  // Query Firestore
  const queryResponse = await makeHttpsRequest(queryOptions, queryPayload);

  if (queryResponse.statusCode !== 200) {
    throw new Error(`Firestore query failed with status ${queryResponse.statusCode}`);
  }

  const queryResult = JSON.parse(queryResponse.data);

  // Current IST date parts for comparison
  const nowIST = formatDateIST(new Date());
  const serverYear = nowIST.getFullYear();
  const serverMonth = nowIST.getMonth();
  const serverDate = nowIST.getDate();

  // Filter documents with timestamp matching current date (IST)
  const matchingDocs = queryResult.filter((entry) => {
    const timestampStr = entry.document?.fields?.timestamp?.timestampValue;
    if (!timestampStr) return false;

    const timestampUTC = new Date(timestampStr);
    const timestampIST = formatDateIST(timestampUTC);

    return (
      timestampIST.getFullYear() === serverYear &&
      timestampIST.getMonth() === serverMonth &&
      timestampIST.getDate() === serverDate
    );
  });

  // Function to delete a document by its full name
  async function deleteDocument(docName) {
    const deletePath = `/v1/${docName}?key=${firebaseConfig.apiKey}`;
    const deleteOptions = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: deletePath,
      method: 'DELETE',
    };
    const deleteResponse = await makeHttpsRequest(deleteOptions);
    if (deleteResponse.statusCode !== 200) {
      throw new Error(`Failed to delete document ${docName}`);
    }
  }

  // Delete matching documents sequentially (or parallel if you prefer)
  for (const doc of matchingDocs) {
    const docName = doc.document.name;
    await deleteDocument(docName);
  }

  // Now add the new document
  const postData = JSON.stringify(firestoreFormattedData);
  const postOptions = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/menu_rating?key=${firebaseConfig.apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const postResponse = await makeHttpsRequest(postOptions, postData);

  if (postResponse.statusCode !== 200) {
    throw new Error(`Failed to add new document: ${postResponse.data}`);
  }

  return {
    message: `New document added${matchingDocs.length > 0 ? ' after deleting previous document(s)' : ''}`,
    response: JSON.parse(postResponse.data),
  };
}
