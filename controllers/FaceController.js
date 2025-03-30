// backend/controllers/FaceController.js
const axios = require('axios');
const fs = require('fs');
const faceapi = require('face-api.js');
const { google } = require('googleapis');

async function searchFaces(req) {
  try {
    // 1. Process uploaded image
    const targetBuffer = req.file.buffer;
    const targetImg = await faceapi.bufferToImage(targetBuffer);
    const targetDetections = await faceapi.detectAllFaces(targetImg)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (targetDetections.length === 0) {
      return { matches: [], error: "No faces found in uploaded image" };
    }

    // 2. Configure Google Drive
    const auth = new google.auth.GoogleAuth({
      keyFile: './service-account.json',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 3. Search Drive folder
    const { folderId } = req.body;
    const driveFiles = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, webContentLink)',
    });

    // 4. Compare faces with adjusted threshold (0.5)
    const matches = [];
    for (const file of driveFiles.data.files) {
      try {
        const response = await axios.get(file.webContentLink, {
          responseType: 'arraybuffer',
          timeout: 10000
        });

        const driveImg = await faceapi.bufferToImage(response.data);
        const driveDetections = await faceapi.detectAllFaces(driveImg)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (driveDetections.length > 0) {
          const distance = faceapi.euclideanDistance(
            targetDetections[0].descriptor,
            driveDetections[0].descriptor
          );
          
          if (distance < 0.5) { // Adjusted threshold
            matches.push({
              fileId: file.id,
              fileName: file.name,
              similarity: Math.round((1 - distance) * 100),
              url: file.webContentLink
            });
          }
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err.message);
      }
    }

    return { 
      matches: matches.sort((a, b) => b.similarity - a.similarity),
      debug: {
        detectedFaces: targetDetections.length,
        comparedFiles: driveFiles.data.files.length,
        successfulComparisons: matches.length
      }
    };

  } catch (error) {
    console.error('Search error:', error);
    return { error: "Face matching failed", details: error.message };
  }
}

module.exports = { searchFaces };