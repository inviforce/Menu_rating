async function GetMenuData(projectId) {
  if (!projectId) throw new Error('projectId is required');

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/menu_data`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Firestore API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const documents = data.documents || [];
  const now = new Date();

  const serverYear = now.getFullYear();
  const serverMonth = now.getMonth();
  const serverDate = now.getDate();

  let menuData = {};

  for (const document of documents) {
    const fields = document.fields;
    if (!fields || !fields.Day || !fields.Day.mapValue) continue;

    const innerFields = fields.Day.mapValue.fields;
    if (!innerFields || !innerFields.Day || !innerFields.Day.timestampValue) continue;

    const firebaseDate = new Date(innerFields.Day.timestampValue);

    const fbYear = firebaseDate.getFullYear();
    const fbMonth = firebaseDate.getMonth();
    const fbDate = firebaseDate.getDate();

    if (fbYear === serverYear && fbMonth === serverMonth && fbDate === serverDate) {
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

export default GetMenuData;
