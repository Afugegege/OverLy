const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');

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
    const scriptPath = path.join(__dirname, 'smtc_daemon.ps1');

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
