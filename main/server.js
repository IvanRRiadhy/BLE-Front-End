import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

// ✅ Serve static files correctly
app.use(express.static(distPath));

// ✅ Fallback only for unknown **non-file** routes
app.get('*', (req, res) => {
  // ⛔ Prevent fallback if it's a request for an actual file (like JS)
  if (req.originalUrl.includes('.')) {
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
