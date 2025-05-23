async function getMenuData(projectId) {
  if (!projectId) throw new Error('projectId is required');

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/menu_data`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Firestore API request failed: ${response.statusText}`);
  }

  const data = await response.json();

  const documents = data.documents || [];
  const currentTime = new Date();

  // Format date as "May 23 2025" (no comma)
  const formatDate = (date) =>
    date
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .replace(',', '');

  const serverDateStr = formatDate(currentTime);
  let menuData = {};

  for (const document of documents) {
    const fields = document.fields;
    if (!fields || !fields.Day || !fields.Day.mapValue) continue;

    const innerFields = fields.Day.mapValue.fields;
    if (!innerFields || !innerFields.Day || !innerFields.Day.timestampValue) continue;

    const firebaseDate = new Date(innerFields.Day.timestampValue);
    const firebaseDateStr = formatDate(firebaseDate);

    if (firebaseDateStr === serverDateStr) {
      // Extract menu fields except 'Day'
      for (const [key, value] of Object.entries(innerFields)) {
        if (key === 'Day') continue;
        if (value.stringValue) {
          menuData[key] = value.stringValue
            .split(',')
            .map((item) => item.trim());
        }
      }
    }
  }

  return menuData;
}

export default getMenuData