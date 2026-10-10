const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
let electronApp = null;
try {
  electronApp = require('electron').app;
} catch (e) {}

function resolveDaemonScriptPath() {
  const possiblePaths = [];

  // 1. Packaged: extraResources path in app resources folder
  if (process.resourcesPath) {
    possiblePaths.push(path.join(process.resourcesPath, 'smtc_daemon.ps1'));
  }

  // 2. Packaged: asarUnpack path
  const unpackedAsarPath = path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'smtc_daemon.ps1');
  possiblePaths.push(unpackedAsarPath);

  // 3. Development / source tree path (when not running from inside app.asar)
  const devPath = path.join(__dirname, 'smtc_daemon.ps1');
  if (!__dirname.includes('app.asar')) {
    possiblePaths.push(devPath);
  }

  // Check which one exists on physical disk (outside asar)
  for (const candidate of possiblePaths) {
    try {
      if (fs.existsSync(candidate) && !candidate.includes('app.asar')) {
        return candidate;
      }
    } catch (e) {}
  }

  // 4. Fallback self-extraction:
  // If somehow the script is only inside app.asar, extract it out of asar to userData folder
  // so external powershell.exe can execute it.
  try {
    const targetDir = (electronApp && typeof electronApp.getPath === 'function')
      ? electronApp.getPath('userData')
      : path.join(process.env.APPDATA || process.env.TEMP, 'overLy');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fallbackPath = path.join(targetDir, 'smtc_daemon.ps1');
    const sourceAsarPath = path.join(__dirname, 'smtc_daemon.ps1');

    if (fs.existsSync(sourceAsarPath)) {
      const scriptContent = fs.readFileSync(sourceAsarPath, 'utf8');
      let needsWrite = true;
      if (fs.existsSync(fallbackPath)) {
        try {
          const existingContent = fs.readFileSync(fallbackPath, 'utf8');
          if (existingContent === scriptContent) {
            needsWrite = false;
          }
        } catch (e) {}
      }
      if (needsWrite) {
        fs.writeFileSync(fallbackPath, scriptContent, 'utf8');
      }
      return fallbackPath;
    }
  } catch (err) {
    console.error('[SMTC SERVICE] Failed extracting daemon script fallback:', err);
  }

  return path.join(__dirname, 'smtc_daemon.ps1');
}

class SmtcService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.buffer = '';
    this.isStopping = false;
    this.lastState = null;
  }

  start() {
    this.isStopping = false;
    const scriptPath = resolveDaemonScriptPath();
    console.log('[SMTC SERVICE] Using script path:', scriptPath);

    try {
      this.process = spawn(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
        {
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );

      this.process.stdout.setEncoding('utf8');
      this.process.stdout.on('data', (chunk) => {
        this.buffer += chunk;
        const lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop(); // keep remainder

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('DATA:')) {
            try {
              const json = trimmed.substring(5);
              const data = JSON.parse(json);
              this.lastState = data;
              this.emit('update', data);
            } catch (e) {
              console.error('[SMTC PARSE ERROR]', e, trimmed);
            }
          } else if (trimmed.startsWith('ERR:')) {
            console.error('[SMTC DAEMON ERR]', trimmed);
          }
        }
      });

      this.process.stderr.setEncoding('utf8');
      this.process.stderr.on('data', (errChunk) => {
        console.error('[SMTC STDERR]', errChunk);
      });

      this.process.on('exit', (code) => {
        this.process = null;
        if (!this.isStopping) {
          // Restart after short delay
          setTimeout(() => this.start(), 1500);
        }
      });

      this.process.on('error', (err) => {
        console.error('SMTC Process error:', err);
      });
    } catch (e) {
      console.error('Failed to start SMTC daemon:', e);
    }
  }

  sendCommand(cmd) {
    if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
      try {
        this.process.stdin.write(cmd + '\n');
      } catch (e) {
        console.error('Error sending command to SMTC:', e);
      }
    }
  }

  togglePlayPause() {
    this.sendCommand('play_pause');
  }

  nextTrack() {
    this.sendCommand('next');
  }

  previousTrack() {
    this.sendCommand('prev');
  }

  seekTo(seconds) {
    if (typeof seconds === 'number' && !isNaN(seconds)) {
      this.sendCommand(`seek:${Math.max(0, Math.round(seconds * 100) / 100)}`);
    }
  }

  stop() {
    this.isStopping = true;
    if (this.process) {
      try {
        this.sendCommand('exit');
        setTimeout(() => {
          if (this.process) {
            this.process.kill();
            this.process = null;
          }
        }, 500);
      } catch (e) {}
    }
  }
}

module.exports = new SmtcService();
