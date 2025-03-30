const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');

const auth = new GoogleAuth({
  keyFile: path.join(__dirname, '../../google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

module.exports = drive;