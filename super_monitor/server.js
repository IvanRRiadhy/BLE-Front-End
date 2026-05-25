import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import axios from 'axios';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

// ✅ Image Proxy Route to bypass CORS
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL is required');

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      validateStatus: false,
    });
    
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    response.data.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).send('Failed to proxy image');
  }
});

// ✅ Serve static files correctly
app.use(express.static(distPath));

// ✅ Fallback only for unknown **non-file** routes
app.get('*', (req, res) => {
  // ⛔ Prevent fallback if it's a request for an actual file (like JS)
  if (req.path.includes('.')) {
    console.log('Request:', req.originalUrl);

    res.status(404).end();
    return;
  }

  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 App running at http://localhost:${PORT}`);
});
