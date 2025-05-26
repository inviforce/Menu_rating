async function checkRatingsByName(name, firebaseConfig) {
  if (!name) {
    throw new Error('Missing name');
  }
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) {
    throw new Error('Invalid Firebase config');
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

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: queryPayload,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to query Firestore');
  }

  const results = await response.json();

  // Current local date (ignore time)
  const now = new Date();
  const serverYear = now.getFullYear();
  const serverMonth = now.getMonth();
  const serverDate = now.getDate();

  const flatRatings = {};

  // Filter results where ratings exist and timestamp matches current date
  results
    .filter(entry => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
    .filter(entry => {
      const timestamp = new Date(entry.document.fields.timestamp.timestampValue);
      return (
        timestamp.getFullYear() === serverYear &&
        timestamp.getMonth() === serverMonth &&
        timestamp.getDate() === serverDate
      );
    })
    .forEach(entry => {
      const type = entry.document.fields.type?.stringValue || '';
      const ratings = entry.document.fields.ratings.mapValue.fields;

      for (const [item, value] of Object.entries(ratings)) {
        const score = parseFloat(value.integerValue || value.doubleValue);
        const compoundKey = `${type}|${item}`;
        flatRatings[compoundKey] = score;
      }
    });

  return Object.keys(flatRatings).length > 0 ? flatRatings : null;
}

export default checkRatingsByName;
