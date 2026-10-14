const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const out = cp.execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n'
    }).toString();
    const token = out.split('\n').find(l => l.startsWith('password='))?.replace('password=', '').trim();
    if (token) return token;
  } catch (err) {}
  return null;
}

const token = getGitHubToken();
if (!token) {
  console.error('[ERROR] Could not find GitHub token.');
  process.exit(1);
}

const owner = 'Afugegege';
const repo = 'OverLy';
const tag = 'v1.0.2';
const releaseName = 'overLy v1.0.2 — Fast Lyrics Sync, Ad & Video Filter, and Dynamic Album Gradient';

const releaseBody = `## What's Changed in v1.0.2

### 🚀 Ultra-Fast Lyrics Sync & "Play Next" Pre-Search
- **Instantaneous (0 ms) Lyrics Loading**: Implemented persistent disk caching in \`userData/lyrics_cache.json\` so previously played tracks load immediately without network delay.
- **Decoupled Lyrics Fetching**: Lyrics stream onto the screen in ~150–250 ms without waiting for heavy album artwork searches.
- **Album Tracklist Predictor**: While listening to a song from an album or EP, overLy automatically predicts upcoming songs and pre-caches their lyrics in the background.

### 🛡️ Ad, Video, and Non-Music Differentiation
- **No More Lyrics for Ads & Videos**: Identifies Spotify ads, YouTube/browser ads, and video players (VLC, PotPlayer, MPV, Windows Media Player, Netflix, etc.) via native SMTC playback types.
- Completely skips lyrics searching for non-music media and displays clean, non-intrusive status badges (\`Ad\`, \`Video\`).

### 🎨 Visual & Layout Polish
- **Dynamic 3-Stop Album Art Gradient**: The pill border progress bar now flows horizontally with colors extracted directly from the album art (dominant, secondary, and highlight).
- **Minimized Action Drawer Auto-Contract**: Added an OS-level cursor bounds monitor so the round album orb contracts immediately when unhovered.
- **Refined Alignment**: Fixed progress bar border geometry and improved lyric contrast in light mode.

---

### Verification & Checksums (SHA-256)
\`\`\`
1343a6cdd8dfe499c8a845f58f791f7252065fc3409632256d81958ea4c6f2d5 *overLy Setup 1.0.2.exe
ef4e1b3dd35e65b6ee0c772058f71c0cfd8bf5ac60f006ec0c4ae27fe63c5731 *overLy 1.0.2.exe
0acc493e76b27d0e4835daccc44083e7e4f5d9259d559479fb0c5e19b494bfaf *overLy-1.0.2-win.zip
\`\`\`
`;

const distDir = path.join(__dirname, '..', 'dist');

async function main() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'overLy-Release-Publisher',
    'Accept': 'application/vnd.github.v3+json'
  };

  console.log(`Checking existing release for ${tag}...`);
  let release = null;
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, { headers });
  if (getRes.ok) {
    release = await getRes.json();
    console.log(`Found existing release: ID ${release.id}`);
  } else if (getRes.status === 404) {
    console.log(`Creating new release for ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: 'main',
        name: releaseName,
        body: releaseBody,
        draft: false,
        prerelease: false
      })
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create release (${createRes.status}): ${errText}`);
    }
    release = await createRes.json();
    console.log(`Successfully created release: ID ${release.id}`);
  } else {
    const errText = await getRes.text();
    throw new Error(`Error querying release: ${errText}`);
  }

  const existingAssets = release.assets || [];

  const filesToUpload = [
    { name: 'overLy Setup 1.0.2.exe', type: 'application/vnd.microsoft.portable-executable' },
    { name: 'overLy 1.0.2.exe', type: 'application/vnd.microsoft.portable-executable' },
    { name: 'overLy-1.0.2-win.zip', type: 'application/zip' },
    { name: 'latest.yml', type: 'text/yaml' },
    { name: 'SHA256SUMS.txt', type: 'text/plain' }
  ];

  for (const item of filesToUpload) {
    const filePath = path.join(distDir, item.name);
    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] File not found: ${filePath}, skipping.`);
      continue;
    }

    const matchedAsset = existingAssets.find(a => a.name === item.name);
    if (matchedAsset) {
      console.log(`Asset ${item.name} already exists (ID ${matchedAsset.id}). Deleting old asset...`);
      const delRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${matchedAsset.id}`, {
        method: 'DELETE',
        headers
      });
      if (delRes.ok) {
        console.log(`Deleted old asset ${item.name}`);
      }
    }

    console.log(`Uploading ${item.name} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)...`);
    const fileBuffer = fs.readFileSync(filePath);
    const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(item.name)}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'overLy-Release-Publisher',
        'Content-Type': item.type,
        'Content-Length': fileBuffer.length
      },
      body: fileBuffer
    });

    if (uploadRes.ok) {
      const assetData = await uploadRes.json();
      console.log(`✓ Uploaded ${item.name} successfully (ID: ${assetData.id})`);
    } else {
      const err = await uploadRes.text();
      console.error(`✗ Failed to upload ${item.name}: ${err}`);
    }
  }

  console.log(`\n🎉 Release published successfully at: https://github.com/${owner}/${repo}/releases/tag/${tag}\n`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
