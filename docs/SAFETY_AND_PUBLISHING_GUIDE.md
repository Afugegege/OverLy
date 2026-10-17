# overLy: Complete Zero-Warning Beta Setup & Publishing Guide

> **Target Audience:** Maintainers and developers preparing **overLy** for beta distribution and production publishing.  
> **Objective:** Ensure the application is 100% cryptographically safe, eliminate or bypass Windows SmartScreen / browser warnings for beta testers, and execute a flawless public release.

---

## Table of Contents

1. [Understanding Windows Warnings & SmartScreen](#1-understanding-windows-warnings--smartscreen)
2. [Phase 1: Application Safety & Hardening Audit](#2-phase-1-application-safety--hardening-audit)
3. [Phase 2: Eliminating Warnings for Beta Testers (Immediate / Zero-Cost)](#3-phase-2-eliminating-warnings-for-beta-testers-immediate--zero-cost)
   - [Strategy A: Microsoft Defender Security Intelligence (WDSI) Pre-Submission](#strategy-a-microsoft-defender-security-intelligence-wdsi-pre-submission)
   - [Strategy B: Beta Self-Signed Certificate & 1-Click Trusted Setup](#strategy-b-beta-self-signed-certificate--1-click-trusted-setup)
   - [Strategy C: Portable Zip & Mark-of-the-Web (MOTW) Handling](#strategy-c-portable-zip--mark-of-the-web-motw-handling)
   - [Strategy D: Ready-to-Use Beta Tester Instructions](#strategy-d-ready-to-use-beta-tester-instructions)
4. [Phase 3: Production Code Signing & Permanent Zero-Warning Options](#4-phase-3-production-code-signing--permanent-zero-warning-options)
   - [Option 1: Microsoft Azure Trusted Signing (Recommended)](#option-1-microsoft-azure-trusted-signing-recommended)
   - [Option 2: Microsoft Store Submission (MSIX)](#option-2-microsoft-store-submission-msix)
   - [Option 3: Traditional Authenticode EV Certificate](#option-3-traditional-authenticode-ev-certificate)
5. [Phase 4: End-to-End Publishing Playbook](#5-phase-4-end-to-end-publishing-playbook)
6. [Automation & Helper Scripts](#6-automation--helper-scripts)

---

## 1. Understanding Windows Warnings & SmartScreen

When users download desktop executables (`.exe`), Windows and web browsers apply multiple security layers. Understanding which layer triggers is crucial to resolving it:

```
User Downloads overLy Setup.exeS
         ▼
[Browser Layer: Chrome / Edge / Firefox]
  ├─ Checks download URL reputation & global download volume.
  └─ Warning: "overLy Setup.exe isn't commonly downloaded and could be dangerous."
         │
         ▼
[NTFS Mark of the Web (Zone.Identifier = 3)]
  ├─ Windows marks downloaded file as untrusted foreign source.
         │
         ▼
[Windows Defender SmartScreen]
  ├─ Checks Authenticode digital signature and file SHA-256 hash against Microsoft cloud database.
  ├─ IF unsigned OR unknown hash:
  │    └─ Warning: "Windows protected your PC: Microsoft Defender SmartScreen prevented an unrecognized app from starting."
         │
         ▼
[Windows UAC (User Account Control)]
  └─ If installer requests admin elevation without valid signature:
       └─ Warning: Yellow banner with "Unknown Publisher".
```

### Key Takeaways for overLy:

- **The app is not detected as malware**: The warning is solely an **unrecognized file hash with zero accumulated reputation**.
- **SmartScreen is reputation-based**: Even signed apps trigger SmartScreen initially until enough users download and run them without complaints, **unless** signed with an Extended Validation (EV) certificate or Microsoft Azure Trusted Signing.
- **Our Architecture Advantage**: overLy uses `requestedExecutionLevel: asInvoker` and per-user installation (`perMachine: false`). It never asks for Windows Administrator rights, preventing severe UAC prompts.

---

## 2. Phase 1: Application Safety & Hardening Audit

Before sharing any build with beta testers, verify that the application satisfies all least-privilege security standards:

### 1. Process & Sandbox Integrity

Verify in `main.js`:

- [x] `contextIsolation: true` is strictly enforced on all `BrowserWindow` instances.
- [x] `nodeIntegration: false` is set so web pages cannot run arbitrary Node.js APIs.
- [x] `sandbox: true` is enabled on renderers.
- [x] Content Security Policy (CSP) headers block inline remote script execution:
  ```html
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https:;"
  />
  ```

### 2. PowerShell SMTC Daemon Hygiene

The background daemon `smtc_daemon.ps1` runs with `-ExecutionPolicy Bypass`:

- [x] Validated that all IPC inputs are strict string commands (`play`, `pause`, `seek:<sec>`, `exit`).
- [x] No `Invoke-Expression` or `eval` of unsanitized strings.
- [x] Daemon checks `[Console]::In.Peek()` and automatically terminates if the parent Electron process dies.
- [x] Extracted album art files in `%TEMP%` are purged on exit.

### 3. Pre-distribution Antivirus Validation (VirusTotal)

Before distributing any binary:

1. Navigate to [VirusTotal](https://www.virustotal.com/).
2. Upload `overLy Setup X.X.X.exe` and `overLy-X.X.X-win.zip`.
3. Confirm 0/72 engines detect false positives.
4. Keep the VirusTotal scan link to share with cautious beta users.

---

## 3. Phase 2: Eliminating Warnings for Beta Testers (Immediate / Zero-Cost)

If you do not have a paid commercial code signing certificate yet, choose one of these proven workflows to provide a frictionless beta experience.

---

### Strategy A: Microsoft Defender Security Intelligence (WDSI) Pre-Submission

_(Recommended: 100% Free, Official Microsoft Process)_

Microsoft allows developers to submit newly compiled executables for automated analysis. Once cleared, Microsoft's cloud definitions whitelist your binary's SHA-256 hash.

#### Step-by-Step Submission:

1. Run `npm run dist` to produce your final installer `dist/overLy Setup X.X.X.exe`.
2. Go to the [Microsoft Security Intelligence Submission Portal](https://www.microsoft.com/en-us/wdsi/filesubmission).
3. Log in with any free Microsoft account.
4. Select **"Software developer"** as your submission type.
5. Fill in details:
   - **Product Name:** `overLy`
   - **Company / Publisher:** `Afugegege (Open Source)`
   - **File:** Upload `overLy Setup X.X.X.exe` (or a `.zip` if size exceeds direct upload limits).
   - **Detection Type:** Check _“Incorrectly detected / SmartScreen warning”_.
   - **Comments:** _"Open-source desktop music lyrics overlay built with Electron. The binary is benign, runs asInvoker, and requires no admin privileges. Requesting reputation clearance for official beta release."_
6. Submit the form.
7. **Timeline:** Microsoft's automated system typically reviews the binary in **1 to 3 hours**. Once validated:
   - Microsoft Defender definitions update globally.
   - The SmartScreen warning is suppressed or downgraded for all Windows machines.

---

### Strategy B: Beta Self-Signed Certificate & 1-Click Trusted Setup

_(Best for internal/private beta teams who want zero warnings)_

Windows allows any machine to trust a custom digital certificate if the certificate is imported into the **Trusted Root Certification Authorities** store.

#### How It Works:

1. You generate a custom Code Signing Certificate (`OverLyBetaCert.pfx`).
2. You sign your Electron installer with it.
3. You provide beta testers with a 1-click batch script (`install-beta-cert.bat`) that installs the cert once.
4. **Result:** Windows treats the installer as **Verified Publisher: overLy Beta**, and SmartScreen will **not** block it.

#### Step 1: Generate Certificate (Maintainer Machine)

Run this in an elevated PowerShell:

```powershell
# Create self-signed Code Signing Certificate
$cert = New-SelfSignedCertificate `
    -Type CodeSigning `
    -Subject "CN=overLy Open Source Beta, O=Afugegege" `
    -KeyUsage DigitalSignature `
    -FriendlyName "overLy Beta Code Signing" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(2)

# Export public certificate (.cer) for beta testers
Export-Certificate -Cert $cert -FilePath ".\build\overLyBetaCert.cer"

# Export private certificate (.pfx) for building (protect with a password)
$password = ConvertTo-SecureString -String "OverLyBeta2026!" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath ".\build\overLyBetaKey.pfx" -Password $password
```

#### Step 2: Configure `package.json` to Sign with the Certificate

In your terminal or CI environment, set:

```bash
# Set environment variables for electron-builder
set CSC_LINK=build\overLyBetaKey.pfx
set CSC_KEY_PASSWORD=OverLyBeta2026!

# Build the signed installer
npm run dist
```

`electron-builder` will sign `overLy Setup X.X.X.exe` and `overLy.exe`.

#### Step 3: Provide 1-Click Trust Script to Beta Testers

Place `overLyBetaCert.cer` and a new script `trust-beta-publisher.bat` in a `beta-helpers/` folder:

```bat
@echo off
:: Run as Administrator to trust the overLy Beta Certificate
echo ========================================================
echo        overLy Beta Certificate Trust Installer
echo ========================================================
certutil -addstore -f "Root" "%~dp0overLyBetaCert.cer"
echo.
echo Certificate successfully installed!
echo You can now install overLy without any SmartScreen warnings.
pause
```

---

### Strategy C: Portable Zip & Mark-of-the-Web (MOTW) Handling

If beta users prefer not running an installer, distribute the portable zip:
`dist/overLy-X.X.X-win.zip`

When downloaded via Chrome/Edge, Windows tags the `.zip` with Mark of the Web. When extracted, every file inside inherits that tag.

#### How Beta Testers Avoid Warnings with Zip:

- **Option 1 (Right Click):** Right-click `overLy-X.X.X-win.zip` -> **Properties** -> Check **"Unblock"** at the bottom right -> Click **Apply**, then extract.
- **Option 2 (PowerShell 1-Liner):**
  ```powershell
  Unblock-File -Path "$HOME\Downloads\overLy-*-win.zip"
  ```
  Once unblocked before extraction, running `overLy.exe` will launch instantly with zero SmartScreen interruptions.

---

### Strategy D: Ready-to-Use Beta Tester Instructions

Copy and paste this message into your Beta Discord, Telegram, or GitHub discussion:

```markdown
### 🎧 Welcome to the overLy Beta Test!

Thank you for helping test **overLy**!

Because this is a brand new beta release that hasn't accumulated hundreds of downloads yet, Windows Defender SmartScreen or your browser may show a "Not commonly downloaded" or "Unrecognized app" notice.

#### How to Install in 5 Seconds:

1. Download **`overLy Setup 1.0.2.exe`** from GitHub Releases.
2. If Microsoft Edge prompts: Click `...` next to the download -> select **Keep** -> **Show more** -> **Keep anyway**.
3. When launching the installer, if the blue **"Windows protected your PC"** box appears:
   - Click **"More info"**
   - Click **"Run anyway"**
4. The installer runs in standard user mode (no administrator password needed) and launches immediately!

_(Optional) You can verify the integrity of your download using the SHA-256 checksums published on the release page._
```

---

## 4. Phase 3: Production Code Signing & Permanent Zero-Warning Options

To eliminate warnings permanently for all public users worldwide, one of the following official channels must be utilized:

| Solution                                   | Cost           | SmartScreen Reputation                       | Setup Complexity                                          | Best For                                |
| :----------------------------------------- | :------------- | :------------------------------------------- | :-------------------------------------------------------- | :-------------------------------------- |
| **Microsoft Azure Trusted Signing**        | ~$9.99/month   | **Instant / Near-Instant**                   | Low (Cloud-based, no hardware)                            | **Recommended for Indie & Open Source** |
| **Microsoft Store (MSIX / Store API)**     | $19 one-time   | **Instant (Zero Warnings)**                  | Medium (Store app packaging)                              | **Broadest consumer reach**             |
| **Traditional Authenticode EV (Hardware)** | $350–$600/year | **Instant**                                  | High (Requires physical USB token or expensive Cloud HSM) | Enterprise teams                        |
| **Standard OV Certificate**                | $80–$200/year  | Gradual (Builds up after ~100–500 downloads) | Medium                                                    | Budget commercial apps                  |

---

### Option 1: Microsoft Azure Trusted Signing (Recommended)

In 2024, Microsoft launched **Azure Trusted Signing** (formerly Azure Code Signing). It replaced traditional expensive hardware dongles with a Microsoft-hosted PKI service:

1. **Prerequisites:**
   - Microsoft Azure account.
   - Verified developer identity (Individual or Organization) in Azure Portal.
2. **Setup with `electron-builder`:**
   - Configure `@electron/windows-sign` or Azure Trusted Signing dlib in your build workflow.
   - In GitHub Actions:
     ```yaml
     - name: Sign Executable with Azure Trusted Signing
       uses: azure/trusted-signing-action@v0.3.15
       with:
         azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
         azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
         azure-client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
         endpoint: https://eus.codesigning.azure.net
         trusted-signing-account-name: "OverLySigning"
         certificate-profile-name: "OverLyPublicProfile"
         files: |
           dist/*.exe
     ```
3. **Result:** Microsoft-signed binaries obtain instant SmartScreen trust because Microsoft directly validates the publisher.

---

### Option 2: Microsoft Store Submission (MSIX)

The Microsoft Store is the most user-friendly distribution channel on Windows:

- **Cost:** One-time $19 developer fee for individuals.
- **SmartScreen:** Zero warnings. The app installs with a single click from the Windows Store.
- **Updates:** Automatic background updates handled by Windows Update.

#### Integration Steps:

`electron-builder` has native support for `appx` (MSIX):

1. In `package.json`, add `"appx"` to `win.target`.
2. Generate publisher identity from your Microsoft Partner Center dashboard.
3. Run `npx electron-builder --win appx`.
4. Upload the generated `.appx` to Microsoft Partner Center.

---

## 5. Phase 4: End-to-End Publishing Playbook

Follow this checklist whenever releasing an official update:

### Step 1: Bump Version & Update Metadata

- [ ] Update `"version"` in `package.json` (e.g. `1.0.3`).
- [ ] Update tag & release notes in `scripts/publish-release.js`.
- [ ] Run `npm test` or local validation (`npm start`).

### Step 2: Clean Build Environment

```bash
# Clean previous build artifacts
if (Test-Path dist) { Remove-Item -Recurse -Force dist }

# Generate high-res installer bitmaps
npm run prebuild
```

### Step 3: Package Deliverables

```bash
# Package Windows Installer (NSIS), Portable ZIP, and Portable EXE
npm run dist
```

This automatically invokes `scripts/generate-bitmaps.js` before building and outputs:

- `dist/overLy Setup 1.0.X.exe`
- `dist/overLy 1.0.X.exe`
- `dist/overLy-1.0.X-win.zip`

### Step 4: Generate Cryptographic Checksums

```bash
npm run checksums
```

This creates `dist/SHA256SUMS.txt` with SHA-256 hashes of all release files.

### Step 5: Pre-Flight Safety Verification

1. Run `Get-FileHash dist\*.* -Algorithm SHA256` to confirm integrity.
2. Upload `dist/overLy Setup 1.0.X.exe` to [VirusTotal](https://www.virustotal.com/).
3. (If unsigned) Submit to [Microsoft Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) for reputation clearance.

### Step 6: Test in Windows Sandbox

Before shipping to users, test the real installer in an isolated environment:

1. Open Windows Search -> type **Windows Sandbox** -> Press Enter.
2. Drag and drop `dist/overLy Setup 1.0.X.exe` into the Sandbox window.
3. Run the installer:
   - Verify it installs cleanly to `%LocalAppData%\Programs\overly`.
   - Verify it starts and SMTC controls detect music.
   - Verify uninstallation cleanly removes shortcuts and registry keys.

### Step 7: Publish to GitHub Releases

```bash
# Upload artifacts and checksums automatically to GitHub
npm run release
```

### Step 8: Distribute via Winget (Windows Package Manager)

Once published on GitHub, tech-savvy users and beta testers can install overLy via `winget`:

```bash
# Using wingetcreate CLI tool
wingetcreate new https://github.com/Afugegege/OverLy/releases/download/v1.0.X/overLy.Setup.1.0.X.exe
```

Follow the interactive prompts to submit a PR to `microsoft/winget-pkgs`. Once merged, users can install with:

```bash
winget install OverLy
```

---

## 6. Automation & Helper Scripts

### Quick Diagnostic Script (`scripts/verify-release.ps1`)

Save this script to verify your `dist/` directory before uploading:

```powershell
Write-Host "=== overLy Release Verification ===" -ForegroundColor Cyan

$distPath = Join-Path $PSScriptRoot "..\dist"
if (!(Test-Path $distPath)) {
    Write-Error "dist folder does not exist. Run npm run dist first."
    exit 1
}

$expectedFiles = @(
    "SHA256SUMS.txt",
    "latest.yml"
)

Get-ChildItem $distPath -Filter "*.exe" | ForEach-Object {
    Write-Host "Checking binary: $($_.Name)" -ForegroundColor Green
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    Write-Host "  SHA256: $hash"

    # Check digital signature status
    $sig = Get-AuthenticodeSignature $_.FullName
    Write-Host "  Signature Status: $($sig.Status)" -ForegroundColor ($sig.Status -eq "Valid" ? "Green" : "Yellow")
}

Write-Host "`nAll pre-flight checks complete." -ForegroundColor Cyan
```

---

_Document maintained by the overLy development team. For architectural details, consult [SECURITY.md](../SECURITY.md)._
