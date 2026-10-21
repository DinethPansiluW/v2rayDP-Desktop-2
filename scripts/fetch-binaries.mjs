#!/usr/bin/env node
/**
 * Automated binary fetcher for sing-box and Wintun
 * Downloads and extracts Windows x64 binaries into resources/bin/
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const binDir = path.join(projectRoot, 'resources', 'bin');
const versionsFilePath = path.join(__dirname, 'versions.json');
const markerFilePath = path.join(binDir, '.versions');

if (!fs.existsSync(versionsFilePath)) {
  console.error(`[fetch-binaries] Error: Missing versions file at ${versionsFilePath}`);
  process.exit(1);
}

const versions = JSON.parse(fs.readFileSync(versionsFilePath, 'utf8'));
const singBoxVer = versions.singBox;
const wintunVer = versions.wintun;

if (!singBoxVer || !wintunVer) {
  console.error('[fetch-binaries] Error: versions.json must specify "singBox" and "wintun" versions.');
  process.exit(1);
}

const singBoxUrl = `https://github.com/SagerNet/sing-box/releases/download/v${singBoxVer}/sing-box-${singBoxVer}-windows-amd64.zip`;
const wintunUrl = `https://www.wintun.net/builds/wintun-${wintunVer}.zip`;

const singBoxExe = path.join(binDir, 'sing-box.exe');
const wintunDll = path.join(binDir, 'wintun.dll');

// Check if already up-to-date
if (fs.existsSync(singBoxExe) && fs.existsSync(wintunDll) && fs.existsSync(markerFilePath)) {
  try {
    const marker = JSON.parse(fs.readFileSync(markerFilePath, 'utf8'));
    if (marker.singBox === singBoxVer && marker.wintun === wintunVer) {
      console.log(`✓ sing-box v${singBoxVer} and Wintun v${wintunVer} already exist in resources/bin/ (up to date).`);
      process.exit(0);
    }
  } catch {}
}

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function downloadFileWithProgress(url, destPath, label, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    let redirectCount = 0;

    const executeDownload = (currentUrl) => {
      const client = currentUrl.startsWith('https://') ? https : http;

      const req = client.get(currentUrl, {
        headers: {
          'User-Agent': 'v2rayDP-Desktop-BinaryFetcher/1.0'
        }
      }, (res) => {
        // Handle HTTP redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return reject(new Error(`Too many redirects while downloading ${label}`));
          }
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http://') && !nextUrl.startsWith('https://')) {
            const parsed = new URL(currentUrl);
            nextUrl = new URL(nextUrl, parsed.origin).href;
          }
          return executeDownload(nextUrl);
        }

        if (res.statusCode === 404) {
          return reject(
            new Error(
              `404 Not Found for ${label} at ${currentUrl}.\n` +
              `Please check and update scripts/versions.json from the official release page:\n` +
              `  - sing-box: https://github.com/SagerNet/sing-box/releases\n` +
              `  - Wintun: https://www.wintun.net/`
            )
          );
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} when downloading ${label} from ${currentUrl}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReport = 0;

        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          if (now - lastReport > 300 || downloadedBytes === totalBytes) {
            lastReport = now;
            const percent = totalBytes > 0 ? ` (${Math.round((downloadedBytes / totalBytes) * 100)}%)` : '';
            process.stdout.write(
              `\r  Downloading ${label}: ${formatBytes(downloadedBytes)}${totalBytes > 0 ? ` / ${formatBytes(totalBytes)}` : ''}${percent}...`
            );
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            process.stdout.write(`\r  ✓ Downloaded ${label}: ${formatBytes(downloadedBytes)} total.       \n`);
            resolve();
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    executeDownload(url);
  });
}

async function downloadWithRetry(url, destPath, label, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      if (attempt > 1) {
        console.log(`[fetch-binaries] Retry attempt ${attempt}/${maxRetries} for ${label}...`);
      }
      await downloadFileWithProgress(url, destPath, label);
      return;
    } catch (err) {
      if (attempt >= maxRetries || err.message.includes('404 Not Found')) {
        throw err;
      }
      console.warn(`[fetch-binaries] Attempt ${attempt} failed: ${err.message}. Retrying in 2 seconds...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log(`====================================================`);
  console.log(` v2rayDP Desktop - Fetching sing-box & Wintun binaries`);
  console.log(` - Target Dir: ${binDir}`);
  console.log(` - sing-box:   v${singBoxVer}`);
  console.log(` - Wintun:     v${wintunVer}`);
  console.log(`====================================================`);

  const tempSingBoxZip = path.join(binDir, `sing-box-${singBoxVer}.zip`);
  const tempWintunZip = path.join(binDir, `wintun-${wintunVer}.zip`);

  try {
    // 1. Download sing-box
    console.log(`\n[1/2] Fetching sing-box v${singBoxVer}...`);
    await downloadWithRetry(singBoxUrl, tempSingBoxZip, `sing-box-${singBoxVer}`);

    console.log(`  Extracting sing-box archive...`);
    const singBoxZip = new AdmZip(tempSingBoxZip);
    const singBoxEntries = singBoxZip.getEntries();
    let extractedSingBox = false;

    for (const entry of singBoxEntries) {
      const fileName = path.basename(entry.entryName);
      if (fileName.toLowerCase() === 'sing-box.exe' || fileName.toLowerCase().endsWith('.dll')) {
        const dest = path.join(binDir, fileName);
        fs.writeFileSync(dest, entry.getData());
        try {
          fs.chmodSync(dest, 0o755);
        } catch {}
        console.log(`  ✓ Extracted ${fileName} -> ${dest}`);
        if (fileName.toLowerCase() === 'sing-box.exe') {
          extractedSingBox = true;
        }
      }
    }

    if (!extractedSingBox) {
      throw new Error(`sing-box.exe not found inside ${singBoxUrl}`);
    }

    // 2. Download Wintun
    console.log(`\n[2/2] Fetching Wintun v${wintunVer}...`);
    await downloadWithRetry(wintunUrl, tempWintunZip, `wintun-${wintunVer}`);

    console.log(`  Extracting wintun.dll...`);
    const wintunZip = new AdmZip(tempWintunZip);
    const wintunEntries = wintunZip.getEntries();
    let extractedWintun = false;

    for (const entry of wintunEntries) {
      const normalizedPath = entry.entryName.replace(/\\/g, '/').toLowerCase();
      if (normalizedPath.endsWith('bin/amd64/wintun.dll') || normalizedPath.endsWith('amd64/wintun.dll')) {
        const dest = path.join(binDir, 'wintun.dll');
        fs.writeFileSync(dest, entry.getData());
        console.log(`  ✓ Extracted wintun.dll -> ${dest}`);
        extractedWintun = true;
        break;
      }
    }

    if (!extractedWintun) {
      throw new Error(`wintun/bin/amd64/wintun.dll not found in ${wintunUrl}`);
    }

    // Write marker
    fs.writeFileSync(
      markerFilePath,
      JSON.stringify({ singBox: singBoxVer, wintun: wintunVer, timestamp: Date.now() }, null, 2),
      'utf8'
    );

    console.log(`\n✓ All binaries successfully downloaded and placed in ${binDir}`);
  } catch (err) {
    console.error(`\n❌ [fetch-binaries] Error: ${err.message}`);
    process.exit(1);
  } finally {
    // Clean up temporary archives
    try {
      if (fs.existsSync(tempSingBoxZip)) fs.unlinkSync(tempSingBoxZip);
      if (fs.existsSync(tempWintunZip)) fs.unlinkSync(tempWintunZip);
    } catch {}
  }
}

main();
