async function GetMenuData(projectId, targetDate) {
  if (!projectId) throw new Error('projectId is required');
  if (!targetDate) throw new Error('targetDate is required (format: YYYY-MM-DD)');

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/menu_data`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Firestore API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const documents = data.documents || [];
  
  // Parse targetDate into a local Date object (year, monthIndex, day)
  const [year, month, day] = targetDate.split('-').map(Number);
  const target = new Date(year, month - 1, day);

  let menuData = {};

  for (const document of documents) {
    const fields = document.fields;
    if (!fields || !fields.Day || !fields.Day.mapValue) continue;

    const innerFields = fields.Day.mapValue.fields;
    if (!innerFields || !innerFields.Day || !innerFields.Day.timestampValue) continue;
    
    // Firestore timestamps are ISO strings — parse as local Date
    const firebaseDate = new Date(innerFields.Day.timestampValue);
    console.log("hey",firebaseDate)
    // Compare year, month, and day to match the targetDate exactly
    if (
      firebaseDate.getFullYear() === target.getFullYear() &&
      firebaseDate.getMonth() === target.getMonth() &&
      firebaseDate.getDate() === target.getDate()
    ) {
      // Iterate all fields except the 'Day' field itself
      for (const [category, value] of Object.entries(innerFields)) {
        if (category === 'Day') continue;

        if (value.stringValue) {
          // Split the comma-separated menu items, trim spaces, and assign to category
          menuData[category] = value.stringValue
            .split(',')
            .map((item) => item.trim());
        }
      }
    }
  }

  return menuData;
}

export default GetMenuData;
