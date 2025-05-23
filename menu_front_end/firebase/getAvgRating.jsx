import https from 'https';

const IST_OFFSET = 330;

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

export default async function getAvgRatingsByType(type, firebaseConfig) {
  if (!type) throw new Error('Type is required');
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Valid firebaseConfig with projectId and apiKey is required');
  }

  const queryPayload = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'type' },
          op: 'EQUAL',
          value: { stringValue: type },
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

  const todaysDocs = results
    .filter(entry => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
    .filter(entry => {
      const ts = new Date(entry.document.fields.timestamp.timestampValue);
      const tsIST = toIST(ts);
      return (
        tsIST.getFullYear() === currentYear &&
        tsIST.getMonth() === currentMonth &&
        tsIST.getDate() === currentDate
      );
    });

  if (todaysDocs.length === 0) {
    return { data: {}, totalCount: 0 };
  }

  const sums = {};
  const counts = {};

  for (const entry of todaysDocs) {
    const ratings = entry.document.fields.ratings.mapValue.fields;
    for (const [key, value] of Object.entries(ratings)) {
      const num = parseFloat(value.integerValue || value.doubleValue);
      sums[key] = (sums[key] || 0) + num;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const result = {};
  for (const key in sums) {
    result[key] = {
      avg: sums[key] / counts[key],
      count: counts[key],
    };
  }

  return { data: result, totalCount: todaysDocs.length };
}
