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
        
        if (responseData.documents && responseData.documents.length > 0) {
          const document = responseData.documents[0];
          const fields = document.fields.Day.mapValue.fields;
          
          const menuData = {};
         
          for (const [key, value] of Object.entries(fields)) {
            if (value.stringValue) {
              menuData[key] = value.stringValue.split(',').map(item => item.trim());
            }
          }

          res.status(200).json(menuData);
        } else {
          res.status(404).json({ message: "No menu data found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error parsing response", error: error.message });
      }
    });
  });

  request.on('error', (e) => {
    res.status(500).json({ message: "Error getting documents", error: e.message });
  });

  request.end();
});

app.post('/menu_rating', (req, res) => {
  const receivedData = req.body;
  console.log('Received:', receivedData);

  // Step 1: Format new data for Firestore
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

  // Step 2: Build query to check for existing doc
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

  const queryReq = https.request(queryOptions, (queryRes) => {
    let responseData = '';
    queryRes.on('data', (chunk) => (responseData += chunk));
    queryRes.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        const existingDoc = result.find(doc => doc.document);

        const proceedToPost = () => {
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
            postRes.on('data', chunk => (postResponse += chunk));
            postRes.on('end', () => {
              res.status(200).json({
                message: 'New document added after deleting previous (if any)',
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
        };

        if (existingDoc) {
          const docName = existingDoc.document.name; 
          const deletePath = `/v1/${docName}?key=${firebaseConfig.apiKey}`;

          const deleteOptions = {
            hostname: 'firestore.googleapis.com',
            port: 443,
            path: deletePath,
            method: 'DELETE',
          };

          const deleteReq = https.request(deleteOptions, (deleteRes) => {
            deleteRes.on('end', () => {
              console.log('Previous document deleted');
              proceedToPost();
            });
            deleteRes.on('data', () => {});
          });

          deleteReq.on('error', (err) => {
            console.error('DELETE error:', err);
            res.status(500).json({ message: 'Failed to delete existing document', error: err.message });
          });

          deleteReq.end();
        } else {
          proceedToPost(); // No match — just insert
        }
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

  const queryPayload = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'menu_rating' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: name },
        },
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

        const ratingsList = results
          .filter(entry => entry.document && entry.document.fields && entry.document.fields.ratings)
          .map(entry => {
            const ratingFields = entry.document.fields.ratings.mapValue.fields;
            const flatRatings = {};

            for (const [key, value] of Object.entries(ratingFields)) {
              flatRatings[key] = parseFloat(value.integerValue || value.doubleValue);
            }

            return flatRatings;
          });

        res.status(200).json(ratingsList.length > 0 ? ratingsList : null);
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
