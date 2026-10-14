# Security Policy & Distribution Trustworthiness

## Overview

**overLy** is an open-source, lightweight floating synced lyrics overlay for Windows. It integrates with Windows System Media Transport Controls (SMTC) to display real-time playback metadata and synchronized lyrics from public music databases (LRCLIB, Deezer, Apple Music).

This document outlines the security architecture of overLy, why certain Windows components are utilized, how release authenticity is verified, and how Windows SmartScreen warnings operate.

---

## Architecture & Security Controls

overLy is designed according to the principle of least privilege:

1. **Sandboxed Renderer Processes**:
   - `contextIsolation: true` is enforced across all windows.
   - `nodeIntegration: false` prevents renderer access to Node.js primitives.
   - `sandbox: true` is strictly enabled.
   - Preload script exposes only a minimal, explicit IPC interface (`window.overlyAPI`) via `contextBridge`.

2. **Content Security Policy (CSP)**:
   - A strict Content Security Policy (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https:;`) is enforced across all HTML views.
   - Inline script execution is blocked.

3. **Navigation & Permission Restrictions**:
   - All browser permissions (camera, microphone, geolocation, notifications) are explicitly denied via `setPermissionRequestHandler`.
   - In-app navigation to arbitrary URLs is blocked. External links (such as project links) are validated and opened only via the default system browser with `shell.openExternal`.
   - Webview tags and unauthorized child window spawning are rejected.

4. **IPC Input Validation**:
   - Every IPC handler performs strict type and boundary validation.
   - Window movement and dimension controls validate numeric bounds to prevent window manipulation.
   - Settings keys are whitelisted to prevent prototype pollution or arbitrary disk writes.

5. **Windows Execution Level**:
   - overLy executes as `asInvoker`.
   - The application does **not** request, require, or run with Windows Administrator privileges.
   - The NSIS installer operates per-user (`%LocalAppData%\Programs\overly`), avoiding administrative UAC prompts.

---

## The PowerShell SMTC Daemon (`smtc_daemon.ps1`)

### Why It Is Used
Windows exposes real-time media player state (track title, artist, playback status, seek timeline, album artwork) via the WinRT `Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager` API. Standard Node.js and Electron runtimes on Windows cannot access WinRT APIs directly without heavy, fragile native C++ compilation modules. 

overLy utilizes a background PowerShell worker script (`smtc_daemon.ps1`) to query the native WinRT API and stream JSON updates over standard input/output.

### Security Guarantees of the Daemon
- **No Administrative Elevation**: The daemon runs with standard user privileges (`asInvoker`).
- **No Dynamic Command Evaluation**: Input from Electron is enqueued through a thread-safe C# bridge and validated against an explicit whitelist of commands (`play`, `pause`, `play_pause`, `next`, `prev`, `seek:<seconds>`, `refresh`, `exit`). No arbitrary PowerShell code or strings are evaluated.
- **Orphan Prevention & Process Hygiene**: The daemon monitors the standard input stream (`stdin`). If Electron crashes, is terminated, or exits, the daemon detects end-of-stream (`IsEof`), cleans up temporary cached thumbnail files, and immediately exits.
- **Temporary File Isolation**: Extracted artwork thumbnails are stored in standard user temporary storage with hashed names and cleaned up on track change and daemon exit.

---

## SmartScreen & Download Reputation

When downloading a new release of overLy using Microsoft Edge or launching it on Windows, you may encounter a prompt:

> *"overLy.Setup.X.X.X.exe is not commonly downloaded and could be dangerous"* or *"Windows protected your PC (Microsoft Defender SmartScreen)"*

### Understanding Warning Types
It is important to distinguish between reputation notices and security detections:

| Notice Type | Meaning | How to Interpret |
| :--- | :--- | :--- |
| **"Not Commonly Downloaded"** | Edge / SmartScreen has not yet seen enough worldwide downloads of this exact file hash. | Expected for newly released open-source software with a new binary hash. It is **not** a malware detection. |
| **"Unknown Publisher"** | The binary is unsigned or signed with a certificate not yet tied to a recognized identity. | The release has not been signed with an Extended Validation (EV) certificate. |
| **"Malware Detected" (Trojan / Virus)** | Microsoft Defender or an AV vendor identified a known malicious signature or heuristic. | Genuine threat warning. If triggered on an official open-source release, investigate for false positives. |
| **"Invalid Signature"** | The cryptographic signature on the binary is corrupted or does not match the file content. | High risk — indicates possible tampering or download corruption. |

### Building Download Reputation
Cryptographic reputation is tied to both the digital certificate and the SHA-256 hash of the binary. As users download and run a release, Microsoft SmartScreen telemetry records safe executions and automatically clears the warning over time.

To verify a file independently or report a false positive to Microsoft:
- Submit the file to [Microsoft Security Intelligence File Submission](https://www.microsoft.com/en-us/wdsi/filesubmission).
- Verify the SHA-256 checksum against the official release manifest as described below.

---

## Verifying Release Integrity

Every official release published on GitHub includes a `SHA256SUMS.txt` manifest containing the cryptographic hashes of all installer, ZIP, and portable binaries.

### How to Verify Downloaded Files

You can verify your downloaded binary on Windows using PowerShell:

```powershell
# 1. Open PowerShell and navigate to your download folder
cd ~/Downloads

# 2. Compute the SHA-256 hash of the downloaded installer
Get-FileHash -Algorithm SHA256 "overLy Setup 1.0.1.exe"
```

Compare the resulting `Hash` string with the entry in the `SHA256SUMS.txt` file on the [Official Releases Page](https://github.com/Afugegege/OverLy/releases). If the hashes match, the file has not been altered or corrupted in transit.

---

## Code Signing

### Current Status
Releases built by automated GitHub workflows or community builds without a private commercial certificate are unsigned. 

### Configuring Signing for Maintainers
The project is fully pre-configured for code signing using `electron-builder`. When an Authenticode or Azure Trusted Signing certificate is available:

1. Set the following environment variables in your build environment:
   - `CSC_LINK`: Path to your `.pfx` file or base64-encoded certificate string.
   - `CSC_KEY_PASSWORD`: Password for the `.pfx` certificate.
2. Run:
   ```bash
   npm run dist
   ```
3. `electron-builder` will automatically invoke `signtool.exe` to sign the application binaries and NSIS installer. If `CSC_LINK` is not set, builds proceed unsigned for local development.
4. **Never commit certificates (`*.pfx`), private keys, or passwords to Git.**

---

## Reporting a Security Vulnerability

If you discover a security vulnerability in overLy, please report it responsibly:

1. Do **not** open a public GitHub issue for undisclosed security vulnerabilities.
2. Submit a private report via [GitHub Security Advisories](https://github.com/Afugegege/OverLy/security/advisories).
3. Provide detailed steps to reproduce the issue and any relevant system logs.

We will acknowledge receipt, investigate the issue, and provide a patch promptly.
