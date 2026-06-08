import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';

const execPromise = util.promisify(exec);

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

// ==========================================
// 🚀 Self-Updating Git & Docker Logic
// ==========================================
let isUpdating = false;
const APP_HOST_PATH = '/app-host';

async function checkAndPerformUpdate() {
  if (isUpdating) {
    return { updated: false, msg: 'An update is already in progress.' };
  }

  if (!fs.existsSync(APP_HOST_PATH) || !fs.existsSync(path.join(APP_HOST_PATH, '.git'))) {
    console.warn(`⚠️ [Updater] Git repository not found at ${APP_HOST_PATH}. Make sure the host project directory is mounted to /app-host.`);
    return { updated: false, msg: 'Updater is disabled: host directory not mounted or not a git repository.' };
  }

  isUpdating = true;

  try {
    console.log('🔄 [Updater] Checking for git updates...');
    
    // 1. Ensure directory is marked as safe in Git to bypass ownership checks inside the container
    await execPromise(`git config --global --add safe.directory ${APP_HOST_PATH}`);

    // 2. Get the current active branch name dynamically
    const { stdout: branchNameRaw } = await execPromise(`git -C ${APP_HOST_PATH} rev-parse --abbrev-ref HEAD`);
    const branchName = branchNameRaw.trim();
    if (!branchName) {
      throw new Error('Could not detect active git branch name.');
    }
    console.log(`[Updater] Current active branch is: "${branchName}"`);

    // 3. Fetch latest from the tracking remote branch
    await execPromise(`git -C ${APP_HOST_PATH} fetch origin ${branchName}`);

    // 4. Compare local and remote commits
    const { stdout: localCommitRaw } = await execPromise(`git -C ${APP_HOST_PATH} rev-parse HEAD`);
    const { stdout: remoteCommitRaw } = await execPromise(`git -C ${APP_HOST_PATH} rev-parse origin/${branchName}`);
    
    const localCommit = localCommitRaw.trim();
    const remoteCommit = remoteCommitRaw.trim();

    if (localCommit === remoteCommit) {
      console.log('✅ [Updater] Application is already up-to-date.');
      isUpdating = false;
      return { updated: false, msg: `Already up-to-date on branch "${branchName}" at commit ${localCommit.slice(0, 7)}.` };
    }

    console.log(`📥 [Updater] New updates detected! (Local: ${localCommit.slice(0, 7)} -> Remote: ${remoteCommit.slice(0, 7)})`);
    console.log('[Updater] Pulling changes from origin...');

    // 5. Pull the changes
    await execPromise(`git -C ${APP_HOST_PATH} pull origin ${branchName}`);
    console.log('✅ [Updater] Pull finished successfully. Triggering Docker Compose rebuild...');

    // 6. Trigger docker compose rebuild asynchronously in the background.
    // (This container will be terminated/recreated, which is expected.)
    exec(`cd ${APP_HOST_PATH} && docker compose up -d --build`, (err, stdout, stderr) => {
      isUpdating = false;
      if (err) {
        console.error('❌ [Updater] Error executing docker compose rebuild:', err);
      } else {
        console.log('✅ [Updater] Docker compose rebuild finished successfully:', stdout);
      }
    });

    return { 
      updated: true, 
      msg: `Update found. Pulled branch "${branchName}" updates. Rebuilding docker container in background...`,
      from: localCommit.slice(0, 7),
      to: remoteCommit.slice(0, 7)
    };
  } catch (error) {
    isUpdating = false;
    console.error('❌ [Updater] Error during update execution:', error.message);
    throw error;
  }
}

// ✅ Manual Remote Update Endpoint
app.get('/_update/check', async (req, res) => {
  try {
    const result = await checkAndPerformUpdate();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Automated Nightly Updater (Runs at 00:00 local time)
function scheduleMidnightUpdate() {
  const checkTime = () => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // Tomorrow
      0, 0, 0 // 00:00:00
    );
    const msToMidnight = nextMidnight.getTime() - now.getTime();

    console.log(`⏰ [Updater] Nightly updater scheduled. Next check in ${Math.round(msToMidnight / 1000 / 60)} minutes (at 00:00).`);

    setTimeout(async () => {
      try {
        console.log('⏰ [Updater] Nightly midnight update check triggering...');
        await checkAndPerformUpdate();
      } catch (err) {
        console.error('❌ [Updater] Nightly update failed:', err.message);
      }
      checkTime(); // Schedule next check
    }, msToMidnight);
  };

  checkTime();
}

// Start auto-updater scheduler
scheduleMidnightUpdate();

// ==========================================

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
