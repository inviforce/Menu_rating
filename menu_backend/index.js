require('dotenv').config();
const express = require('express');
const https = require('https');
const cors = require('cors');

const firebaseConfig = {
  apiKey: process.env.APIKEY,
  projectId: process.env.PROJECTID,
};

const app = express();

app.use(cors()); 

app.use(express.json());

app.get('/menu_data', (req, res) => {
  const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/menu_data`,
    method: 'GET',
  };

  const request = https.request(options, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const responseData = JSON.parse(data);
        const documents = responseData.documents || [];
        const currentTime = new Date();

        // Format date as "May 23 2025"
        const formatDate = (date) =>
          date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).replace(',', '');

        const serverDateStr = formatDate(currentTime);
        let menuData = {};

        documents.forEach((document) => {
          const fields = document.fields;
          if (!fields || !fields.Day || !fields.Day.mapValue) return;

          const innerFields = fields.Day.mapValue.fields;
          if (!innerFields || !innerFields.Day || !innerFields.Day.timestampValue) return;

          const firebaseDate = new Date(innerFields.Day.timestampValue);
          const firebaseDateStr = formatDate(firebaseDate);

          if (firebaseDateStr === serverDateStr) {
            // Extract menu fields (skip "Day")
            for (const [key, value] of Object.entries(innerFields)) {
              if (key === 'Day') continue;
              if (value.stringValue) {
                menuData[key] = value.stringValue
                  .split(',')
                  .map((item) => item.trim());
              }
            }
          }
        });

        res.status(200).json(menuData);
      } catch (error) {
        res
          .status(500)
          .json({ message: 'Error parsing response', error: error.message });
      }
    });
  });

  request.on('error', (error) => {
    res.status(500).json({ message: 'Request failed', error: error.message });
  });

  request.end();
});

app.post('/menu_rating', (req, res) => {
  const receivedData = req.body;
  console.log('Received:', receivedData);

  // Format new data for Firestore
  const firestoreFormattedData = {
    fields: {
      ratings: {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(receivedData)
              .filter(([k, v]) => typeof v === 'number')
              .map(([k, v]) => [k, { integerValue: v }])
          ),
        },
      },
      type: { stringValue: receivedData.type },
      name: { stringValue: receivedData.name },
      timestamp: { timestampValue: new Date().toISOString() },
    },
  };

  // Query for existing docs with matching name and type
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

  const IST_OFFSET = 330; // minutes

  const now = new Date();
  const nowIST = new Date(now.getTime() + IST_OFFSET * 60000);
  const serverYear = nowIST.getFullYear();
  const serverMonth = nowIST.getMonth();
  const serverDate = nowIST.getDate();

  const deleteDocumentsByDate = async (docs) => {
    const deletePromises = docs.map(doc => {
      return new Promise((resolve, reject) => {
        const docName = doc.document.name;
        const deletePath = `/v1/${docName}?key=${firebaseConfig.apiKey}`;

        const deleteOptions = {
          hostname: 'firestore.googleapis.com',
          port: 443,
          path: deletePath,
          method: 'DELETE',
        };

        const deleteReq = https.request(deleteOptions, (deleteRes) => {
          deleteRes.on('data', () => {}); // consume data to avoid memory leaks
          deleteRes.on('end', () => {
            console.log(`Deleted document: ${docName}`);
            resolve();
          });
        });

        deleteReq.on('error', (err) => {
          console.error('DELETE error:', err);
          reject(err);
        });

        deleteReq.end();
      });
    });

    await Promise.all(deletePromises);
  };

  const queryReq = https.request(queryOptions, (queryRes) => {
    let responseData = '';

    queryRes.on('data', (chunk) => (responseData += chunk));
    queryRes.on('end', async () => {
      try {
        const result = JSON.parse(responseData);

        // Filter docs with timestamp matching server date (IST)
        const matchingDocs = result.filter(entry => {
          if (!entry.document?.fields?.timestamp?.timestampValue) return false;

          const timestampUTC = new Date(entry.document.fields.timestamp.timestampValue);
          const timestampIST = new Date(timestampUTC.getTime() + IST_OFFSET * 60000);

          return (
            timestampIST.getFullYear() === serverYear &&
            timestampIST.getMonth() === serverMonth &&
            timestampIST.getDate() === serverDate
          );
        });

        if (matchingDocs.length > 0) {
          try {
            await deleteDocumentsByDate(matchingDocs);
          } catch (delErr) {
            return res.status(500).json({ message: 'Failed to delete existing document(s)', error: delErr.message });
          }
        }

        // After deleting matched docs, add the new document
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

        const postReq = https.request(postOptions, (postRes) => {
          let postResponse = '';
          postRes.on('data', (chunk) => (postResponse += chunk));
          postRes.on('end', () => {
            res.status(200).json({
              message: `New document added${matchingDocs.length > 0 ? ' after deleting previous document(s)' : ''}`,
              response: JSON.parse(postResponse),
            });
          });
        });

        postReq.on('error', (err) => {
          console.error('POST error:', err);
          res.status(500).json({ message: 'Failed to add new document', error: err.message });
        });

        postReq.write(postData);
        postReq.end();

      } catch (err) {
        console.error('Query parse error:', err.message);
        res.status(500).json({ message: 'Failed to process Firestore query', error: err.message });
      }
    });
  });

  queryReq.on('error', (err) => {
    console.error('Query error:', err.message);
    res.status(500).json({ message: 'Failed to query Firestore', error: err.message });
  });

  queryReq.write(queryPayload);
  queryReq.end();
});

app.post('/checker', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing name in request body' });
  }

  // Only filter by name in Firestore query, no date filter here
  const queryPayload = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: name }
        }
      }
    }
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

  const queryReq = https.request(options, (queryRes) => {
    let responseData = '';

    queryRes.on('data', chunk => responseData += chunk);
    queryRes.on('end', () => {
      try {
        const results = JSON.parse(responseData);

        // Get current server date in IST (ignore time)
        const IST_OFFSET = 330; // minutes
        const now = new Date();
        const nowIST = new Date(now.getTime() + IST_OFFSET * 60000);
        const serverYear = nowIST.getFullYear();
        const serverMonth = nowIST.getMonth();
        const serverDate = nowIST.getDate();

        // Filter results to only those with matching date in timestamp (IST)
        const filteredRatings = results
          .filter(entry => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
          .filter(entry => {
            const timestampUTC = new Date(entry.document.fields.timestamp.timestampValue);

            // Convert Firestore UTC timestamp to IST
            const timestampIST = new Date(timestampUTC.getTime() + IST_OFFSET * 60000);

            return (
              timestampIST.getFullYear() === serverYear &&
              timestampIST.getMonth() === serverMonth &&
              timestampIST.getDate() === serverDate
            );
          })
          .map(entry => {
            const ratingFields = entry.document.fields.ratings.mapValue.fields;
            const flatRatings = {};

            for (const [key, value] of Object.entries(ratingFields)) {
              flatRatings[key] = parseFloat(value.integerValue || value.doubleValue);
            }

            return flatRatings;
          });

        res.status(200).json(filteredRatings.length > 0 ? filteredRatings : null);
      } catch (err) {
        console.error('Parsing error:', err.message);
        res.status(500).json({ error: 'Invalid Firestore response' });
      }
    });
  });

  queryReq.on('error', (err) => {
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Failed to query Firestore' });
  });

  queryReq.write(queryPayload);
  queryReq.end();
});

app.post('/avg_info', (req, res) => {
  const { type } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Missing type in request body' });
  }

  const queryPayload = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'type' },
          op: 'EQUAL',
          value: { stringValue: type }
        }
      }
    }
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

  const IST_OFFSET = 330; // minutes

  const queryReq = https.request(options, (queryRes) => {
    let responseData = '';

    queryRes.on('data', chunk => responseData += chunk);
    queryRes.on('end', () => {
      try {
        const results = JSON.parse(responseData);

        // Current server date in IST (ignore time)
        const now = new Date();
        const nowIST = new Date(now.getTime() + IST_OFFSET * 60000);
        const serverYear = nowIST.getFullYear();
        const serverMonth = nowIST.getMonth();
        const serverDate = nowIST.getDate();

        // Filter documents by date = today (IST)
        const todaysDocs = results
          .filter(entry => entry.document?.fields?.ratings && entry.document.fields.timestamp?.timestampValue)
          .filter(entry => {
            const timestampUTC = new Date(entry.document.fields.timestamp.timestampValue);
            const timestampIST = new Date(timestampUTC.getTime() + IST_OFFSET * 60000);
            return (
              timestampIST.getFullYear() === serverYear &&
              timestampIST.getMonth() === serverMonth &&
              timestampIST.getDate() === serverDate
            );
          });

        if (todaysDocs.length === 0) {
          return res.status(200).json({ data: {}, totalCount: 0 });
        }

        // Accumulate sums and counts for each item
        const sums = {};
        const counts = {};

        todaysDocs.forEach(entry => {
          const ratingFields = entry.document.fields.ratings.mapValue.fields;
          for (const [key, value] of Object.entries(ratingFields)) {
            const rating = parseFloat(value.integerValue || value.doubleValue);
            sums[key] = (sums[key] || 0) + rating;
            counts[key] = (counts[key] || 0) + 1;
          }
        });

        // Compute averages and format result as item: { avg, count }
        const result = {};
        for (const key in sums) {
          result[key] = {
            avg: sums[key] / counts[key],
            count: counts[key]
          };
        }

        res.status(200).json({
          data: result,
          totalCount: todaysDocs.length
        });

      } catch (err) {
        console.error('Parsing error:', err.message);
        res.status(500).json({ error: 'Invalid Firestore response' });
      }
    });
  });

  queryReq.on('error', (err) => {
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Failed to query Firestore' });
  });

  queryReq.write(queryPayload);
  queryReq.end();
});

const PORT = process.env.PORT || 3767;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
