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
const releaseName = `overLy ${tag} — Setup Polish, Unpinned Fullscreen & Accurate Lyrics/Art Matching`;

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

### 🖥️ Fullscreen Window Behavior
- **Windowed Fullscreen**: When entering Immersive Fullscreen mode, overLy is no longer pinned/always-on-top, behaving like a regular full-screen window that respects Alt-Tab and multitasking. Exiting fullscreen restores your desired pin state.

### 🎨 Shadow-Free Clean Aesthetic
- **Zero Square Shadows Across All Layouts**: Completely removed the dark rectangular compositor boundary artifact in immersive mode, and enforced zero drop shadows behind the lyrics viewport and window across Card, Pill, Lyrics, Minimized, and Immersive layouts.
- **Frameless Window Consistency**: Removed native Windows DWM window resizing drop shadows on transparent surfaces.

### 🎵 High-Accuracy Lyrics & Album Artwork Matching
- **Strict Artist Verification**: Fixed iTunes, Deezer, and Kugou artwork matchers to strictly verify artist names, completely preventing unrelated songs with similar titles from being fetched.
- **DJ, Demo & Cover Guards**: Added strict mismatch guards so original songs are never hijacked by DJ mixes, demos, instrumental backing tracks, or covers (and vice versa).
- **Persistent Toolbar Refetch**: Toolbar refetch now remembers manual lyric queries instead of falling back to raw uncleaned strings.

### ⚙️ Setup Wizard Improvements
- **First-Run Persistence**: Fixed setup wizard auto-popup so it only appears once on initial installation and does not pop up on every subsequent launch.
- **Minimalist Balanced Design**: Streamlined the left setup banner with clean vertical alignment and refined aesthetics in harmony with the rest of the application.

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
