import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const upload = multer({ dest: 'uploads/' });
app.post('/upload', upload.single('file'), async (req, res) => {
  const { file } = req;
  const { userMessage } = req.body;

  try {
    const filePath = path.resolve(file.path); // Resolve the file path
    const fileData = await fs.readFile(filePath); // Read file as binary

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyD5bZgmA5-AsuupoEwUvP_HYxKWJalJjqM", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: userMessage },
              {
                fileData: {
                  mimeType: file.mimetype, // E.g. 'application/pdf'
                  data: fileData.toString('base64') // Base64 encode the file
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain"
        }
      })
    });

    const geminiResponse = await response.json();
    res.json(geminiResponse); // Send back response to client
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
