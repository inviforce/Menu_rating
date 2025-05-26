export default async function getAvgRatingsByType(type, firebaseConfig) {
  if (!type) throw new Error('Type is required');
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Valid firebaseConfig with projectId and apiKey is required');
  }

  const queryPayload = {
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
  };

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryPayload),
    }
  );

  if (!response.ok) {
    throw new Error(`Firestore query failed: ${response.statusText}`);
  }

  const results = await response.json();

  // Convert UTC to IST
  const IST_OFFSET = 330;
  const toIST = (date) => new Date(date.getTime() + IST_OFFSET * 60000);

  const nowIST = toIST(new Date());
  const currentYear = nowIST.getFullYear();
  const currentMonth = nowIST.getMonth();
  const currentDate = nowIST.getDate();

  const todaysDocs = results
    .filter((entry) => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
    .filter((entry) => {
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
    const docType = entry.document.fields.type?.stringValue || '';

    for (const [item, value] of Object.entries(ratings)) {
      const num = parseFloat(value.integerValue || value.doubleValue);
      // Compose key as item|type for aggregation
      const compoundKey = `${item}|${docType}`;
      sums[compoundKey] = (sums[compoundKey] || 0) + num;
      counts[compoundKey] = (counts[compoundKey] || 0) + 1;
    }
  }

  const result = {};
  for (const key in sums) {
    result[key] = {
      avg: sums[key] / counts[key],
      count: counts[key],
    };
  }

  // Flip keys from item|type to type|item before returning
  const flippedResult = {};
  for (const key in result) {
    const [item, type] = key.split('|');
    const flippedKey = `${type}|${item}`;
    flippedResult[flippedKey] = result[key];
  }

  //console.log(flippedResult);
  return { data: flippedResult, totalCount: todaysDocs.length };
}
