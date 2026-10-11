const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function convertBgraTo24Bmp(bgraBuffer, width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = Buffer.alloc(fileSize);

  // File Header (14 bytes)
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt16LE(0, 6);
  buffer.writeUInt16LE(0, 8);
  buffer.writeUInt32LE(54, 10);

  // DIB Header (BITMAPINFOHEADER - 40 bytes)
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22); // positive = bottom-to-top
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);

  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = offset;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      buffer[offset++] = bgraBuffer[srcIdx];     // B
      buffer[offset++] = bgraBuffer[srcIdx + 1]; // G
      buffer[offset++] = bgraBuffer[srcIdx + 2]; // R
    }
    while (offset - rowStart < rowSize) {
      buffer[offset++] = 0;
    }
  }

  return buffer;
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  try {
    const combinedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #000000;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          #sidebarContainer {
            position: absolute;
            top: 0;
            left: 0;
            width: 164px;
            height: 314px;
            background: #0d0f14;
            color: #ffffff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px 12px;
            text-align: center;
          }
          .wave-glow-1 {
            position: absolute;
            top: -40px;
            left: -30px;
            width: 220px;
            height: 180px;
            background: radial-gradient(circle, rgba(255, 48, 64, 0.45) 0%, rgba(220, 20, 40, 0.15) 50%, transparent 75%);
            filter: blur(14px);
          }
          .wave-glow-2 {
            position: absolute;
            bottom: -50px;
            right: -40px;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(255, 30, 50, 0.3) 0%, rgba(180, 10, 30, 0.08) 55%, transparent 75%);
            filter: blur(16px);
          }
          .brand-box {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .logo-svg {
            width: 76px;
            height: 76px;
            margin-bottom: 12px;
            filter: drop-shadow(0 0 16px rgba(255, 48, 64, 0.6));
          }
          .brand-title {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
            margin-bottom: 4px;
          }
          .brand-tagline {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #ff3b4e;
            text-transform: uppercase;
            margin-bottom: 14px;
          }
          .divider {
            width: 30px;
            height: 1.5px;
            background: rgba(255, 255, 255, 0.25);
            margin-bottom: 12px;
            border-radius: 1px;
          }
          .brand-sub {
            font-size: 10px;
            font-weight: 400;
            line-height: 1.35;
            color: rgba(255, 255, 255, 0.65);
            padding: 0 4px;
          }

          #headerContainer {
            position: absolute;
            top: 0;
            left: 200px;
            width: 150px;
            height: 57px;
            background: #0d0f14;
            color: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 14px;
          }
          .header-glow {
            position: absolute;
            right: 0;
            top: -10px;
            width: 100px;
            height: 77px;
            background: radial-gradient(circle, rgba(255, 48, 64, 0.4) 0%, transparent 70%);
            filter: blur(8px);
          }
          .header-row {
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
            z-index: 2;
          }
          .header-logo {
            width: 32px;
            height: 32px;
            filter: drop-shadow(0 0 8px rgba(255, 48, 64, 0.5));
          }
          .header-title {
            font-size: 15px;
            font-weight: 800;
            letter-spacing: -0.3px;
            color: #ffffff;
          }
        </style>
      </head>
      <body>
        <div id="sidebarContainer">
          <div class="wave-glow-1"></div>
          <div class="wave-glow-2"></div>
          <div class="brand-box">
            <svg class="logo-svg" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="38" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-dasharray="160 50" transform="rotate(-30 50 50)"/>
              <rect x="36" y="36" width="28" height="28" rx="8" transform="rotate(45 50 50)" fill="#ff3040"/>
            </svg>
            <div class="brand-title">overLy</div>
            <div class="brand-tagline">MUSIC, IN FLOW.</div>
            <div class="divider"></div>
            <div class="brand-sub">Synchronized lyrics for your desktop.</div>
          </div>
        </div>

        <div id="headerContainer">
          <div class="header-glow"></div>
          <div class="header-row">
            <div class="header-title">overLy</div>
            <svg class="header-logo" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="38" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-dasharray="160 50" transform="rotate(-30 50 50)"/>
              <rect x="36" y="36" width="28" height="28" rx="8" transform="rotate(45 50 50)" fill="#ff3040"/>
            </svg>
          </div>
        </div>
      </body>
      </html>
    `;

    const tempPath = path.join(__dirname, 'temp-render.html');
    fs.writeFileSync(tempPath, combinedHtml, 'utf8');

    const win = new BrowserWindow({
      width: 600,
      height: 500,
      show: false,
      frame: false,
      webPreferences: { offscreen: true }
    });

    await win.loadFile(tempPath);
    await new Promise(r => setTimeout(r, 600));

    // Capture Sidebar (164 x 314 at 0, 0)
    const sidebarImg = await win.capturePage({ x: 0, y: 0, width: 164, height: 314 });
    const sidebarBmp = convertBgraTo24Bmp(sidebarImg.toBitmap(), 164, 314);

    // Capture Header (150 x 57 at 200, 0)
    const headerImg = await win.capturePage({ x: 200, y: 0, width: 150, height: 57 });
    const headerBmp = convertBgraTo24Bmp(headerImg.toBitmap(), 150, 57);

    win.destroy();
    try { fs.unlinkSync(tempPath); } catch (_) {}

    const buildDir = path.join(__dirname, '..', 'build');
    const assetsDir = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp);
    fs.writeFileSync(path.join(buildDir, 'uninstallerSidebar.bmp'), sidebarBmp);
    fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp);

    fs.writeFileSync(path.join(assetsDir, 'installerSidebar.bmp'), sidebarBmp);
    fs.writeFileSync(path.join(assetsDir, 'uninstallerSidebar.bmp'), sidebarBmp);
    fs.writeFileSync(path.join(assetsDir, 'installerHeader.bmp'), headerBmp);

    console.log('SUCCESS: Bitmaps generated successfully!');
  } catch (err) {
    console.error('ERROR generating bitmaps:', err);
  } finally {
    app.quit();
  }
});
