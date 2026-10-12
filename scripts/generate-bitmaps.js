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
    const iconPath = path.join(__dirname, '..', 'OverLy-icon.png');
    const iconBase64 = fs.readFileSync(iconPath).toString('base64');
    const iconDataUrl = `data:image/png;base64,${iconBase64}`;

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
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            -webkit-font-smoothing: antialiased;
          }

          /* Modern Dark Glass Sidebar (164 x 314) */
          .sidebar-box {
            position: absolute;
            top: 0;
            width: 164px;
            height: 314px;
            background: linear-gradient(165deg, #11141e 0%, #0c0e14 55%, #151824 100%);
            color: #ffffff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 22px 12px;
            text-align: center;
            box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.08);
          }

          #sidebarContainer {
            left: 0;
          }

          #uninstallerSidebarContainer {
            left: 180px;
          }

          /* Frosted Ambient Red Glows matching overLy --accent: #FF3040 */
          .glow-orb-top {
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            width: 180px;
            height: 140px;
            background: radial-gradient(circle, rgba(255, 48, 64, 0.32) 0%, rgba(255, 48, 64, 0.08) 55%, transparent 75%);
            filter: blur(16px);
            pointer-events: none;
          }

          .glow-orb-bottom {
            position: absolute;
            bottom: -30px;
            right: -20px;
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba(255, 48, 64, 0.18) 0%, transparent 70%);
            filter: blur(18px);
            pointer-events: none;
          }

          .brand-wrapper {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }

          /* Glowing Disc Logo */
          .app-logo-disc {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            margin-bottom: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 48, 64, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.16);
            display: block;
            object-fit: contain;
          }

          /* Minimalist Typography */
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
            line-height: 1.1;
          }

          .brand-pill {
            display: inline-block;
            margin-top: 6px;
            background: rgba(255, 48, 64, 0.15);
            border: 1px solid rgba(255, 48, 64, 0.35);
            color: #ff4757;
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 2.5px 8px;
            border-radius: 12px;
          }

          .brand-pill.uninstaller {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.22);
            color: #e4e4e7;
          }

          .brand-divider {
            width: 24px;
            height: 1.5px;
            background: rgba(255, 255, 255, 0.18);
            margin: 13px 0 10px 0;
            border-radius: 1px;
          }

          .brand-subtext {
            font-size: 9.5px;
            font-weight: 400;
            line-height: 1.45;
            color: rgba(255, 255, 255, 0.65);
            padding: 0 4px;
          }

          .brand-badge-footer {
            margin-top: 14px;
            font-size: 8px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.38);
            letter-spacing: 0.5px;
          }

          /* Modern Dark Header (150 x 57) */
          #headerContainer {
            position: absolute;
            top: 0;
            left: 360px;
            width: 150px;
            height: 57px;
            background: linear-gradient(135deg, #0c0e14 0%, #141722 100%);
            color: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 14px;
            box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
          }

          .header-glow {
            position: absolute;
            right: 0;
            top: 0;
            width: 100px;
            height: 57px;
            background: radial-gradient(circle, rgba(255, 48, 64, 0.25) 0%, transparent 70%);
            filter: blur(8px);
          }

          .header-content {
            display: flex;
            align-items: center;
            gap: 9px;
            position: relative;
            z-index: 2;
          }

          .header-text-col {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }

          .header-name {
            font-size: 14px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.3px;
            line-height: 1.1;
          }

          .header-tag {
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 1.2px;
            color: #ff4757;
            text-transform: uppercase;
            margin-top: 2px;
          }

          .header-logo-img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 48, 64, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.15);
            display: block;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <!-- Installer Sidebar (164 x 314) -->
        <div id="sidebarContainer" class="sidebar-box">
          <div class="glow-orb-top"></div>
          <div class="glow-orb-bottom"></div>
          <div class="brand-wrapper">
            <img class="app-logo-disc" src="${iconDataUrl}" alt="overLy">
            <div class="brand-title">overLy</div>
            <div class="brand-pill">MUSIC, IN FLOW.</div>
            <div class="brand-divider"></div>
            <div class="brand-subtext">Synchronized lyrics for your desktop.</div>
            <div class="brand-badge-footer">SMTC Native • 60 FPS</div>
          </div>
        </div>

        <!-- Dedicated Uninstaller Sidebar (164 x 314) -->
        <div id="uninstallerSidebarContainer" class="sidebar-box">
          <div class="glow-orb-top"></div>
          <div class="glow-orb-bottom"></div>
          <div class="brand-wrapper">
            <img class="app-logo-disc" src="${iconDataUrl}" alt="overLy">
            <div class="brand-title">overLy</div>
            <div class="brand-pill uninstaller">UNINSTALL WIZARD</div>
            <div class="brand-divider"></div>
            <div class="brand-subtext">Clean removal from your desktop.</div>
            <div class="brand-badge-footer">Safe &amp; Clean Removal</div>
          </div>
        </div>

        <!-- Inner Pages Header (150 x 57) -->
        <div id="headerContainer">
          <div class="header-glow"></div>
          <div class="header-content">
            <div class="header-text-col">
              <div class="header-name">overLy</div>
              <div class="header-tag">DESKTOP</div>
            </div>
            <img class="header-logo-img" src="${iconDataUrl}" alt="overLy">
          </div>
        </div>
      </body>
      </html>
    `;

    const tempPath = path.join(__dirname, 'temp-render.html');
    fs.writeFileSync(tempPath, combinedHtml, 'utf8');

    const win = new BrowserWindow({
      width: 700,
      height: 500,
      show: false,
      frame: false,
      webPreferences: { offscreen: true }
    });

    await win.loadFile(tempPath);
    await new Promise(r => setTimeout(r, 700));

    // Capture Installer Sidebar (164 x 314 at 0, 0)
    const sidebarImg = await win.capturePage({ x: 0, y: 0, width: 164, height: 314 });
    const sidebarBmp = convertBgraTo24Bmp(sidebarImg.toBitmap(), 164, 314);

    // Capture Uninstaller Sidebar (164 x 314 at 180, 0)
    const uninstSidebarImg = await win.capturePage({ x: 180, y: 0, width: 164, height: 314 });
    const uninstSidebarBmp = convertBgraTo24Bmp(uninstSidebarImg.toBitmap(), 164, 314);

    // Capture Header (150 x 57 at 360, 0)
    const headerImg = await win.capturePage({ x: 360, y: 0, width: 150, height: 57 });
    const headerBmp = convertBgraTo24Bmp(headerImg.toBitmap(), 150, 57);

    win.destroy();
    try { fs.unlinkSync(tempPath); } catch (_) {}

    const buildDir = path.join(__dirname, '..', 'build');
    const assetsDir = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    // Write to build/ directory
    fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp);
    fs.writeFileSync(path.join(buildDir, 'uninstallerSidebar.bmp'), uninstSidebarBmp);
    fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp);

    // Write to assets/ directory
    fs.writeFileSync(path.join(assetsDir, 'installerSidebar.bmp'), sidebarBmp);
    fs.writeFileSync(path.join(assetsDir, 'uninstallerSidebar.bmp'), uninstSidebarBmp);
    fs.writeFileSync(path.join(assetsDir, 'installerHeader.bmp'), headerBmp);

    console.log('SUCCESS: Generated authentic overLy installer & uninstaller bitmaps!');
  } catch (err) {
    console.error('ERROR generating bitmaps:', err);
    process.exit(1);
  } finally {
    app.quit();
  }
});
