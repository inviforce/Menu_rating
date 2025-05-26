export default async function getAvgRatingsByType(firebaseConfig, targetDate) {
  if (!targetDate) throw new Error('targetDate is required (format: YYYY-MM-DD)');
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Valid firebaseConfig with projectId and apiKey is required');
  }

  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }]
    }
  };

  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`;
  console.log('[getAvgRatingsByType] Target Date:', targetDate);
  console.log('[getAvgRatingsByType] Query URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(queryPayload),
  });

  if (!response.ok) {
    throw new Error(`Firestore query failed: ${response.statusText}`);
  }

  const results = await response.json();
  console.log('[getAvgRatingsByType] Total documents fetched:', results);

  // Convert targetDate to IST Date object
  const [year, month, day] = targetDate.split('-').map(Number);
  const targetIST = new Date(year, month - 1, day);

  // Convert timestamp to IST
  const IST_OFFSET = 330;
  const toIST = (date) => new Date(date.getTime() + IST_OFFSET * 60000);

  const matchingDocs = results
    .filter((entry) => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
    .filter((entry) => {
      const ts = new Date(entry.document.fields.timestamp.timestampValue);
      const tsIST = toIST(ts);
      return (
        tsIST.getFullYear() === targetIST.getFullYear() &&
        tsIST.getMonth() === targetIST.getMonth() &&
        tsIST.getDate() === targetIST.getDate()
      );
    });

  console.log('[getAvgRatingsByType] Matching documents for target date:', matchingDocs.length);

  if (matchingDocs.length === 0) {
    return { data: {}, totalCount: 0 };
  }

  const sums = {};
  const counts = {};

  for (const entry of matchingDocs) {
    const ratings = entry.document.fields.ratings.mapValue.fields;
    const docType = entry.document.fields.type?.stringValue || '';
    for (const [item, value] of Object.entries(ratings)) {
      const num = parseFloat(value.integerValue || value.doubleValue);
      if (!isNaN(num)) {
        // Compose key as item|type
        const compoundKey = `${item}|${docType}`;
        sums[compoundKey] = (sums[compoundKey] || 0) + num;
        counts[compoundKey] = (counts[compoundKey] || 0) + 1;
      }
    }
  }

  const result = {};
  for (const key in sums) {
    result[key] = {
      avg: parseFloat((sums[key] / counts[key]).toFixed(2)),
      count: counts[key],
    };
  }

  return { data: result, totalCount: matchingDocs.length };
}
