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
const pkg = require('../package.json');
const tag = 'v' + pkg.version;
const releaseName = `overLy ${tag} — Immersive Studio Customizer, Centered Dock & Multi-Source Artwork`;

const distDir = path.join(__dirname, '..', 'dist');

function getChecksumContent() {
  const sumsPath = path.join(distDir, 'SHA256SUMS.txt');
  if (fs.existsSync(sumsPath)) {
    return fs.readFileSync(sumsPath, 'utf8').trim();
  }
  return '';
}

function getReleaseBody() {
  const checksums = getChecksumContent();
  return `## What's Changed in ${tag}

### 🎨 Immersive Fullscreen Customizer Panel
- **Real-Time Lyrics Text Sizing**: Dynamic lyrics text size slider (14px–38px) with instant preset buttons (Small, Default, Large, XL).
- **Background Contrast Dimmer**: Smooth slider (10%–90%) for the perfect balance between artwork ambiance and lyric readability.
- **Stage Layout Switcher**: Instant switching between Split View (artwork left, lyrics right) and Centered View (focused centered lyrics stage).
- **Live Timing Calibration & Lyric Glow**: Precision live sync offset adjustment (±0.5s) and album-colored halo glow toggle for the active singing line.

### 🎛️ Centered Bottom Playback Dock
- **Integrated Dock Controls**: Floating centered bottom playback dock in fullscreen immersive mode with centered Previous, Play/Pause, Next controls and interactive timeline seeker.

### 🖼️ High-Resolution Artwork & Fallback Engine
- **Multi-Source Scraping**: Integrated QQ Music and Kugou high-res artwork scrapers alongside iTunes multi-region stores (TW, HK, CN, JP) and Deezer.
- **Safe Proxy Fetching**: Safe IPC pipeline resolving artwork without referrer or CORS blocks.

---

### Verification & Checksums (SHA-256)
\`\`\`
${checksums || 'See SHA256SUMS.txt'}
\`\`\`
`;
}

async function main() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'overLy-Release-Publisher',
    'Accept': 'application/vnd.github.v3+json'
  };

  const releaseBody = getReleaseBody();

  console.log(`Checking existing release for ${tag}...`);
  let release = null;
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, { headers });
  if (getRes.ok) {
    release = await getRes.json();
    console.log(`Found existing release: ID ${release.id}`);
    // Update release body if changed
    await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: releaseBody, name: releaseName })
    });
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
    { name: `overLy Setup ${pkg.version}.exe`, type: 'application/vnd.microsoft.portable-executable' },
    { name: `overLy Setup ${pkg.version}.zip`, type: 'application/zip' },
    { name: `overLy ${pkg.version}.exe`, type: 'application/vnd.microsoft.portable-executable' },
    { name: `overLy-${pkg.version}-win.zip`, type: 'application/zip' },
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
