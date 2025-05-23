import https from 'https';

const IST_OFFSET = 330; // IST in minutes

function toIST(date) {
  return new Date(date.getTime() + IST_OFFSET * 60000);
}

function makeHttpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

export default async function checkRatingsByName(name, firebaseConfig) {
  if (!name) throw new Error('Name is required');
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Valid firebaseConfig with projectId and apiKey is required');
  }

  const queryPayload = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: name },
        },
      },
    },
  });

  const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(queryPayload),
    },
  };

  const { statusCode, data } = await makeHttpsRequest(options, queryPayload);
  if (statusCode !== 200) {
    throw new Error(`Firestore query failed with status ${statusCode}`);
  }

  const results = JSON.parse(data);

  const nowIST = toIST(new Date());
  const currentYear = nowIST.getFullYear();
  const currentMonth = nowIST.getMonth();
  const currentDate = nowIST.getDate();

  const ratings = results
    .filter((entry) => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
    .filter((entry) => {
      const ts = new Date(entry.document.fields.timestamp.timestampValue);
      const tsIST = toIST(ts);
      return (
        tsIST.getFullYear() === currentYear &&
        tsIST.getMonth() === currentMonth &&
        tsIST.getDate() === currentDate
      );
    })
    .map((entry) => {
      const fields = entry.document.fields.ratings.mapValue.fields;
      const flat = {};
      for (const [k, v] of Object.entries(fields)) {
        flat[k] = parseFloat(v.integerValue || v.doubleValue);
      }
      return flat;
    });

  return ratings.length > 0 ? ratings : null;
}
