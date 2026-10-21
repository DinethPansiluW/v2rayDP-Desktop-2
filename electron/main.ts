/**
 * v2rayDP Desktop - Electron Main Process
 * Full-Device VPN Client powered by sing-box (1.13+) and Wintun (0.14+)
 *
 * Handles:
 * - Single-instance lock
 * - Window lifecycle, minimize/close to tray
 * - System Tray with dynamic Connect/Disconnect/Open/Exit menu
 * - sing-box binary lifecycle with Wintun virtual network adapter (TUN mode)
 * - Process isolation, mutual exclusion, and configuration generation
 * - Wi-Fi monitoring via `netsh wlan show interfaces`
 * - TCP/TLS latency tester with allowInsecure: true
 * - JSON persistence in app.getPath('userData')
 * - Elevated Windows Task Scheduler for Start-with-Windows
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as net from 'net';
import * as tls from 'tls';
import { spawn, exec, ChildProcess } from 'child_process';
import {
  ServerProfile,
  ConnectionState,
  TrafficStats,
  AutomationSettings,
  HotspotSettings,
  BlockSettings,
  DesktopSettings,
  AppLog,
  WifiStatus
} from '../src/core/types';
import { VmessLinkParser } from '../src/core/VmessLinkParser';
import { AutomationDecision } from '../src/core/AutomationDecision';
import { BlockManager } from '../src/core/BlockManager';
import defaultSources from '../src/assets/blocklist_sources.json';

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentSingBoxChild: ChildProcess | null = null;
let isStoppingIntentionally = false;
let isQuitting = false;
let cleanedUp = false;
let currentClashApiPort = 9090;

// Config store files in userData
const userDataPath = app.getPath('userData');
const storeFilePath = path.join(userDataPath, 'v2raydp_config.json');
const singBoxConfigPath = path.join(userDataPath, 'config.json');
const adblockJsonPath = path.join(userDataPath, 'adblock.json');
const adblockSrsPath = path.join(userDataPath, 'adblock.srs');
const blocklistsDir = path.join(userDataPath, 'blocklists');

interface AppStore {
  profiles: ServerProfile[];
  automation: AutomationSettings;
  hotspot: HotspotSettings;
  block: BlockSettings;
  settings: DesktopSettings;
  logs: AppLog[];
}

function loadStore(): AppStore {
  try {
    if (fs.existsSync(storeFilePath)) {
      const data = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(data);
      return {
        profiles: parsed.profiles || [],
        automation: {
          isAutomationGloballyEnabled: parsed.automation?.isAutomationGloballyEnabled ?? true,
          rules: parsed.automation?.rules || [],
          fallbackRule: parsed.automation?.fallbackRule || {
            enabled: true,
            action: 'connect',
            profileId: null
          },
          autoStopOnWifiLeave: parsed.automation?.autoStopOnWifiLeave ?? true,
          wifiLeavePolicy: parsed.automation?.wifiLeavePolicy || 'STOP_VPN',
          autoStopOnWifiOff: parsed.automation?.autoStopOnWifiOff ?? true,
          autoReconnectOnWifiReturn: parsed.automation?.autoReconnectOnWifiReturn ?? true,
          manualOverrideSuppressed: parsed.automation?.manualOverrideSuppressed || false,
          manualOverrideReason: parsed.automation?.manualOverrideReason || '',
          manualOverrideNetworkKey: parsed.automation?.manualOverrideNetworkKey || null,
          manualConnectedProfileId: parsed.automation?.manualConnectedProfileId || null,
          manualConnectedNetworkKey: parsed.automation?.manualConnectedNetworkKey || null,
          stoppedByLeaveWifiSsid: parsed.automation?.stoppedByLeaveWifiSsid || null
        },
        hotspot: {
          isHotspotSharingEnabled: parsed.hotspot?.isHotspotSharingEnabled || false,
          hotspotProxyPort: parsed.hotspot?.hotspotProxyPort || 10808,
          httpProxyPort: parsed.hotspot?.httpProxyPort || 10809,
          requireAuth: parsed.hotspot?.requireAuth || false,
          username: parsed.hotspot?.username,
          password: parsed.hotspot?.password
        },
        block: parsed.block || BlockManager.getDefaultSettings(),
        settings: {
          mode: 'tun',
          primaryDns: parsed.settings?.primaryDns || '1.1.1.1',
          secondaryDns: parsed.settings?.secondaryDns || '8.8.8.8',
          isBypassLan: parsed.settings?.isBypassLan !== false,
          logLevel: parsed.settings?.logLevel || 'warning',
          minimizeToTray: parsed.settings?.minimizeToTray !== false,
          closeToTray: parsed.settings?.closeToTray !== false,
          startWithWindows: parsed.settings?.startWithWindows || false,
          startMinimized: parsed.settings?.startMinimized || false,
          autoConnectOnLaunch: parsed.settings?.autoConnectOnLaunch || false
        },
        logs: parsed.logs || []
      };
    }
  } catch (err) {
    console.error('Failed to load store file:', err);
  }

  return {
    profiles: [],
    automation: {
      isAutomationGloballyEnabled: true,
      rules: [],
      fallbackRule: {
        enabled: true,
        action: 'connect',
        profileId: null
      },
      autoStopOnWifiLeave: true,
      wifiLeavePolicy: 'STOP_VPN',
      autoStopOnWifiOff: true,
      autoReconnectOnWifiReturn: true,
      manualOverrideSuppressed: false,
      manualOverrideReason: '',
      manualOverrideNetworkKey: null,
      manualConnectedProfileId: null,
      manualConnectedNetworkKey: null,
      stoppedByLeaveWifiSsid: null
    },
    hotspot: {
      isHotspotSharingEnabled: false,
      hotspotProxyPort: 10808,
      httpProxyPort: 10809,
      requireAuth: false
    },
    block: BlockManager.getDefaultSettings(),
    settings: {
      mode: 'tun',
      primaryDns: '1.1.1.1',
      secondaryDns: '8.8.8.8',
      isBypassLan: true,
      logLevel: 'warning',
      minimizeToTray: true,
      closeToTray: true,
      startWithWindows: false,
      startMinimized: false,
      autoConnectOnLaunch: false
    },
    logs: []
  };
}

let store: AppStore = loadStore();

function saveStore(): void {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save store file:', err);
  }
}

// Current runtime connection state
let currentConnectionState: ConnectionState = {
  status: 'disconnected',
  reason: 'Idle',
  activeProfile: null
};

let trafficStats: TrafficStats = {
  uploadSpeedBps: 0,
  downloadSpeedBps: 0,
  sessionTxBytes: 0,
  sessionRxBytes: 0,
  connectedDurationSeconds: 0
};

let connectStartTime = 0;
let prevStatsUplink = 0;
let prevStatsDownlink = 0;
let trafficTimer: NodeJS.Timeout | null = null;
let wifiPollTimer: NodeJS.Timeout | null = null;
let currentWifiStatus: WifiStatus = {
  connected: false,
  ssid: null
};

function addLog(level: AppLog['level'], tag: string, message: string, triggerReason?: string) {
  const log: AppLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    level,
    tag,
    message,
    triggerReason
  };
  store.logs.unshift(log);
  if (store.logs.length > 500) store.logs.pop();
  saveStore();
  mainWindow?.webContents.send('on-log', log);
}

// ==========================================
// Path Resolution
// ==========================================
function getSingBoxExecutablePath(): string {
  if (app.isPackaged) {
    const resPath = process.resourcesPath || path.join(app.getAppPath(), '..');
    return path.join(resPath, 'bin', 'sing-box.exe');
  } else {
    return path.join(app.getAppPath(), 'resources', 'bin', 'sing-box.exe');
  }
}

function getWintunDllPath(): string {
  if (app.isPackaged) {
    const resPath = process.resourcesPath || path.join(app.getAppPath(), '..');
    return path.join(resPath, 'bin', 'wintun.dll');
  } else {
    return path.join(app.getAppPath(), 'resources', 'bin', 'wintun.dll');
  }
}

function getAppIconPath(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'dist', 'app_logo.png');
  } else {
    return path.join(app.getAppPath(), 'public', 'app_logo.png');
  }
}

// ==========================================
// Process Serialization & Mutex
// ==========================================
let operationMutex: Promise<any> = Promise.resolve();

function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const result = operationMutex.then(() => fn());
  operationMutex = result.catch(() => {});
  return result;
}

/**
 * Kill any stale sing-box.exe processes on Windows to prevent port or adapter conflicts
 */
function killStaleProcesses(): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve();
    }
    exec('taskkill /F /IM sing-box.exe', () => {
      resolve();
    });
  });
}

/**
 * Checks admin elevation in dev mode. The packaged .exe is elevated via manifest.
 */
function checkAdminElevation(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(true);
    }
    exec('fltmc', (err) => {
      resolve(!err);
    });
  });
}

/**
 * Finds a free random port on loopback
 */
function getFreeRandomPort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Fast node TCP/TLS preflight check
 */
function fastNodeCheck(
  address: string,
  port: number,
  tlsMode: 'none' | 'tls' | 'reality',
  sni: string,
  timeoutMs = 2500
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();

    const finish = (ok: boolean, error?: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        ok,
        latencyMs: Date.now() - start,
        error
      });
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      if (tlsMode === 'tls' || tlsMode === 'reality') {
        const tlsSocket = tls.connect(
          {
            socket,
            servername: sni || address,
            rejectUnauthorized: false
          },
          () => {
            tlsSocket.destroy();
            finish(true);
          }
        );
        tlsSocket.on('error', () => {
          tlsSocket.destroy();
          // Handshake reached server
          finish(true);
        });
      } else {
        finish(true);
      }
    });

    socket.once('error', (err: any) => {
      finish(false, err.code || err.message || 'Connection refused');
    });

    socket.once('timeout', () => {
      finish(false, 'Connection timed out (server not responding)');
    });

    try {
      socket.connect(port, address);
    } catch (err: any) {
      finish(false, err.message);
    }
  });
}

async function stopCurrentSingBoxProcess(): Promise<void> {
  if (!currentSingBoxChild) return;

  const childToKill = currentSingBoxChild;
  currentSingBoxChild = null;
  isStoppingIntentionally = true;

  try {
    childToKill.kill('SIGKILL');
  } catch {}

  await new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    childToKill.once('exit', done);
    setTimeout(done, 1500);
  });

  isStoppingIntentionally = false;
}

// Gather all active blocked domains from cache & custom rules
function getActiveBlockedDomains(): string[] {
  const block = store.block;
  if (!block.isBlockingEnabled) return [];

  const domains = new Set<string>();

  for (const rule of block.customRules || []) {
    const norm = BlockManager.normalizeCustomRule(rule);
    if (norm) domains.add(norm);
  }

  if (fs.existsSync(blocklistsDir)) {
    const enabledSources = (block.sources || []).filter((s) => s.enabled);
    for (const source of enabledSources) {
      const filePath = path.join(blocklistsDir, `${source.id}.txt`);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          for (const line of lines) {
            const domain = line.trim();
            if (domain) domains.add(domain);
          }
        } catch {}
      }
    }
  }

  return Array.from(domains);
}

/**
 * Generates rule-set file in userData for sing-box
 */
function prepareAdblockRuleSet(binaryPath: string, domains: string[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (domains.length === 0) {
      return resolve(undefined);
    }

    try {
      const sourceObj = {
        version: 1,
        rules: [
          {
            domain_suffix: domains
          }
        ]
      };

      fs.writeFileSync(adblockJsonPath, JSON.stringify(sourceObj, null, 2), 'utf8');

      // Attempt to compile with sing-box rule-set compile
      const binDir = path.dirname(binaryPath);
      const compileCmd = `"${binaryPath}" rule-set compile "${adblockJsonPath}" -o "${adblockSrsPath}"`;

      exec(compileCmd, { cwd: binDir }, (err) => {
        if (!err && fs.existsSync(adblockSrsPath)) {
          resolve(adblockSrsPath);
        } else {
          // Fall back to source format directly
          resolve(adblockJsonPath);
        }
      });
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Checks sing-box config validity using "sing-box check -c config.json"
 */
function checkSingBoxConfig(binaryPath: string, configPath: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const binDir = path.dirname(binaryPath);
    exec(`"${binaryPath}" check -c "${configPath}"`, { cwd: binDir }, (err, stdout, stderr) => {
      const output = `${stdout || ''}\n${stderr || ''}`.trim();
      if (err) {
        resolve({ ok: false, output });
      } else {
        resolve({ ok: true, output });
      }
    });
  });
}

/**
 * Waits for clash_api /version to respond with 200 OK
 */
function waitForClashApiReady(port: number, child: ChildProcess, timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    let timer: NodeJS.Timeout | null = null;

    child.once('exit', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    });

    const check = async () => {
      if (resolved) return;
      if (child.exitCode !== null || child.killed) {
        resolved = true;
        cleanup();
        return resolve(false);
      }

      if (Date.now() - start >= timeoutMs) {
        resolved = true;
        cleanup();
        return resolve(false);
      }

      try {
        const res = await fetch(`http://127.0.0.1:${port}/version`, {
          signal: AbortSignal.timeout(500)
        });
        if (res.ok) {
          resolved = true;
          cleanup();
          return resolve(true);
        }
      } catch {}

      if (!resolved) {
        timer = setTimeout(check, 150);
      }
    };

    check();
  });
}

async function startSingBoxInternal(profile: ServerProfile): Promise<boolean> {
  await stopCurrentSingBoxProcess();
  stopTrafficMonitor();

  const binaryPath = getSingBoxExecutablePath();
  const wintunPath = getWintunDllPath();
  const desktopSettings = store.settings;
  const hotspot = store.hotspot;

  // Startup self-check: verify binaries exist
  if (!fs.existsSync(binaryPath)) {
    const errorMsg = `sing-box.exe not found at path: ${binaryPath}`;
    addLog('ERROR', 'sing-box', errorMsg);
    currentConnectionState = {
      status: 'error',
      reason: errorMsg,
      errorMessage: errorMsg,
      activeProfile: null
    };
    mainWindow?.webContents.send('on-state-change', currentConnectionState);
    updateTrayMenu();
    return false;
  }

  if (process.platform === 'win32' && !fs.existsSync(wintunPath)) {
    const errorMsg = `wintun.dll not found at path: ${wintunPath}`;
    addLog('ERROR', 'sing-box', errorMsg);
    currentConnectionState = {
      status: 'error',
      reason: errorMsg,
      errorMessage: errorMsg,
      activeProfile: null
    };
    mainWindow?.webContents.send('on-state-change', currentConnectionState);
    updateTrayMenu();
    return false;
  }

  // Pre-connection status: connecting
  currentConnectionState = {
    status: 'connecting',
    reason: `Connecting to ${profile.name}...`,
    profileName: profile.name,
    activeProfile: profile,
    connectedAt: Date.now(),
    virtualAdapterName: 'v2raydp-tun'
  };
  mainWindow?.webContents.send('on-state-change', currentConnectionState);
  updateTrayMenu();

  // Fast preflight server connectivity check
  addLog('INFO', 'sing-box', `Checking remote server availability: ${profile.address}:${profile.port}...`);
  const preflight = await fastNodeCheck(profile.address, profile.port, profile.tls, profile.sni, 2500);
  if (!preflight.ok) {
    const errorMsg = `Server unreachable (${profile.address}:${profile.port}): ${preflight.error}`;
    addLog('WARN', 'sing-box', errorMsg);
    currentConnectionState = {
      status: 'error',
      reason: errorMsg,
      errorMessage: errorMsg,
      activeProfile: null
    };
    mainWindow?.webContents.send('on-state-change', currentConnectionState);
    updateTrayMenu();
    return false;
  }
  addLog('INFO', 'sing-box', `Server reached in ${preflight.latencyMs}ms. Generating TUN VPN configuration...`);

  // Prepare adblock rule-set
  const activeBlockedDomains = getActiveBlockedDomains();
  const ruleSetPath = await prepareAdblockRuleSet(binaryPath, activeBlockedDomains);

  // Allocate free random port for clash_api
  currentClashApiPort = await getFreeRandomPort();

  const singBoxJson = VmessLinkParser.toSingBoxConfigJson(profile, {
    clashApiPort: currentClashApiPort,
    enableHotspot: hotspot.isHotspotSharingEnabled,
    hotspotPort: hotspot.hotspotProxyPort || 10808,
    hotspotRequireAuth: hotspot.requireAuth,
    hotspotUsername: hotspot.username,
    hotspotPassword: hotspot.password,
    bypassLan: desktopSettings.isBypassLan,
    primaryDns: desktopSettings.primaryDns,
    secondaryDns: desktopSettings.secondaryDns,
    ruleSetPath,
    blockedDomains: ruleSetPath ? undefined : activeBlockedDomains,
    logLevel: desktopSettings.logLevel,
    tunInterfaceName: 'v2raydp-tun'
  });

  fs.writeFileSync(singBoxConfigPath, singBoxJson, 'utf8');

  // Verify configuration before spawning: sing-box check -c config.json
  const checkResult = await checkSingBoxConfig(binaryPath, singBoxConfigPath);
  if (!checkResult.ok) {
    const errorMsg = `Configuration check failed:\n${checkResult.output}`;
    addLog('ERROR', 'sing-box', errorMsg);
    currentConnectionState = {
      status: 'error',
      reason: errorMsg,
      errorMessage: errorMsg,
      activeProfile: null
    };
    mainWindow?.webContents.send('on-state-change', currentConnectionState);
    updateTrayMenu();
    return false;
  }

  let lastLines: string[] = [];
  const binDir = path.dirname(binaryPath);

  try {
    const child = spawn(binaryPath, ['run', '-c', singBoxConfigPath], {
      cwd: binDir,
      windowsHide: true,
      env: {
        ...process.env
      }
    });
    currentSingBoxChild = child;

    const appendLog = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      lastLines.push(trimmed);
      if (lastLines.length > 20) lastLines.shift();

      if (trimmed.includes('FATAL') || trimmed.includes('panic:')) {
        addLog('ERROR', 'sing-box', trimmed);
      } else if (trimmed.includes('WARN')) {
        addLog('WARN', 'sing-box', trimmed);
      } else {
        addLog('INFO', 'sing-box', trimmed);
      }

      // Check if connection was rejected (derive blocked counter)
      if (trimmed.toLowerCase().includes('reject') || trimmed.toLowerCase().includes('blocked')) {
        if (store.block.totalBlockedCount === null) {
          store.block.totalBlockedCount = 1;
          store.block.sessionBlockedCount = 1;
        } else {
          store.block.totalBlockedCount += 1;
          store.block.sessionBlockedCount = (store.block.sessionBlockedCount || 0) + 1;
        }
        saveStore();
      }
    };

    child.stdout?.on('data', (d) => {
      d.toString().split('\n').forEach(appendLog);
    });

    child.stderr?.on('data', (d) => {
      d.toString().split('\n').forEach(appendLog);
    });

    child.on('error', (err) => {
      if (child !== currentSingBoxChild) return;
      addLog('ERROR', 'sing-box', `Process error: ${err.message}`);
      disconnectVpnInternal(`sing-box process crashed: ${err.message}`);
    });

    child.on('exit', (code, signal) => {
      if (child !== currentSingBoxChild || isStoppingIntentionally) return;

      if (currentConnectionState.status === 'connected') {
        const exitMsg = `sing-box terminated unexpectedly (code: ${code}, signal: ${signal})`;
        addLog('WARN', 'sing-box', exitMsg);
        disconnectVpnInternal('VPN engine stopped unexpectedly');
      }
    });

    // Wait for clash_api to respond on /version (up to 10s)
    const isReady = await waitForClashApiReady(currentClashApiPort, child, 10000);

    if (!isReady || child !== currentSingBoxChild || child.exitCode !== null) {
      const failReason = lastLines.join('\n') || 'Failed to initialize TUN virtual adapter or clash_api';
      addLog('ERROR', 'sing-box', `Startup failure: ${failReason}`);
      await stopCurrentSingBoxProcess();

      currentConnectionState = {
        status: 'error',
        reason: failReason,
        errorMessage: failReason,
        activeProfile: null
      };
      mainWindow?.webContents.send('on-state-change', currentConnectionState);
      updateTrayMenu();
      return false;
    }

    // Connected successfully!
    connectStartTime = Date.now();
    prevStatsUplink = 0;
    prevStatsDownlink = 0;
    trafficStats = {
      uploadSpeedBps: 0,
      downloadSpeedBps: 0,
      sessionTxBytes: 0,
      sessionRxBytes: 0,
      connectedDurationSeconds: 0
    };

    currentConnectionState = {
      status: 'connected',
      reason: 'Connected',
      profileName: profile.name,
      activeProfile: profile,
      connectedAt: connectStartTime,
      virtualAdapterName: 'v2raydp-tun'
    };

    mainWindow?.webContents.send('on-state-change', currentConnectionState);
    mainWindow?.webContents.send('on-traffic-stats', trafficStats);
    updateTrayMenu();
    startRealTrafficMonitor(currentClashApiPort);
    addLog(
      'INFO',
      'TUN',
      `Full-Device VPN active for "${profile.name}" via Wintun adapter (v2raydp-tun). All system traffic routed.`
    );
    return true;
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    addLog('ERROR', 'sing-box', `Failed to start sing-box: ${errorMsg}`);
    currentConnectionState = {
      status: 'error',
      reason: errorMsg,
      errorMessage: errorMsg,
      activeProfile: null
    };
    mainWindow?.webContents.send('on-state-change', currentConnectionState);
    updateTrayMenu();
    return false;
  }
}

async function disconnectVpnInternal(reason = 'Disconnected'): Promise<void> {
  stopTrafficMonitor();
  await stopCurrentSingBoxProcess();
  await killStaleProcesses();

  currentConnectionState = {
    status: 'disconnected',
    reason,
    activeProfile: null
  };

  trafficStats = {
    uploadSpeedBps: 0,
    downloadSpeedBps: 0,
    sessionTxBytes: trafficStats.sessionTxBytes,
    sessionRxBytes: trafficStats.sessionRxBytes,
    connectedDurationSeconds: trafficStats.connectedDurationSeconds
  };

  mainWindow?.webContents.send('on-state-change', currentConnectionState);
  mainWindow?.webContents.send('on-traffic-stats', trafficStats);
  updateTrayMenu();
  addLog('INFO', 'TUN', `Disconnected: ${reason}. Wintun virtual adapter released.`);
}

function startSingBox(profile: ServerProfile): Promise<boolean> {
  return runSerialized(() => startSingBoxInternal(profile));
}

function disconnectVpn(reason = 'Disconnected'): Promise<void> {
  return runSerialized(() => disconnectVpnInternal(reason));
}

// Helper to restart sing-box with the currently RUNNING profile
async function restartRunningProfileIfActive(): Promise<void> {
  if (currentConnectionState.status === 'connected' && currentConnectionState.activeProfile) {
    await startSingBox(currentConnectionState.activeProfile);
  }
}

// ==========================================
// Real Traffic Monitor via clash_api /connections
// ==========================================
function stopTrafficMonitor(): void {
  if (trafficTimer) {
    clearInterval(trafficTimer);
    trafficTimer = null;
  }
}

function startRealTrafficMonitor(clashPort: number): void {
  stopTrafficMonitor();

  trafficTimer = setInterval(async () => {
    if (currentConnectionState.status !== 'connected' || !currentSingBoxChild) return;

    try {
      const res = await fetch(`http://127.0.0.1:${clashPort}/connections`, {
        signal: AbortSignal.timeout(900)
      });
      if (!res.ok) return;

      const data = await res.json();
      const currentUplink = Number(data.uploadTotal) || 0;
      const currentDownlink = Number(data.downloadTotal) || 0;

      const deltaUp = prevStatsUplink > 0 ? Math.max(0, currentUplink - prevStatsUplink) : 0;
      const deltaDown = prevStatsDownlink > 0 ? Math.max(0, currentDownlink - prevStatsDownlink) : 0;

      prevStatsUplink = currentUplink;
      prevStatsDownlink = currentDownlink;

      const duration = Math.floor((Date.now() - connectStartTime) / 1000);

      trafficStats = {
        uploadSpeedBps: deltaUp,
        downloadSpeedBps: deltaDown,
        sessionTxBytes: currentUplink,
        sessionRxBytes: currentDownlink,
        connectedDurationSeconds: duration
      };

      mainWindow?.webContents.send('on-traffic-stats', trafficStats);
    } catch {}
  }, 1000);
}

// ==========================================
// Windows Task Scheduler for Start-with-Windows
// ==========================================
function syncWindowsStartupTask(enabled: boolean, startMinimized: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve();
    }

    const taskName = 'v2rayDP Desktop';

    if (!enabled) {
      exec(`schtasks /Delete /TN "${taskName}" /F`, () => {
        resolve();
      });
      return;
    }

    const exePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const args = startMinimized ? ' --minimized' : '';
    const taskRun = `\\"${exePath}\\"${args}`;
    const cmd = `schtasks /Create /TN "${taskName}" /TR "${taskRun}" /SC ONLOGON /RL HIGHEST /F`;

    exec(cmd, () => {
      resolve();
    });
  });
}

// ==========================================
// Windows Wi-Fi Monitoring (netsh)
// ==========================================
function pollWifiState(): Promise<WifiStatus> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ connected: true, ssid: 'Demo_Office_WiFi' });
      return;
    }

    exec('netsh wlan show interfaces', { encoding: 'utf8' }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ connected: false, ssid: null });
        return;
      }

      const stateMatch = stdout.match(/State\s*:\s*(connected|disconnected)/i);
      const isConnected = stateMatch ? stateMatch[1].toLowerCase() === 'connected' : false;

      const ssidMatch = stdout.match(/^\s*SSID\s*:\s*(.*)$/im);
      let ssid = ssidMatch ? ssidMatch[1].trim() : null;
      if (ssid === '' || ssid === '<unknown ssid>') ssid = null;

      const nameMatch = stdout.match(/Name\s*:\s*(.*)$/im);
      const ifName = nameMatch ? nameMatch[1].trim() : undefined;

      const signalMatch = stdout.match(/Signal\s*:\s*(\d+)%/i);
      const signal = signalMatch ? parseInt(signalMatch[1], 10) : undefined;

      const status: WifiStatus = {
        connected: isConnected,
        ssid,
        interfaceName: ifName,
        signalPercent: signal,
        locationPermissionHint: isConnected && !ssid
      };

      resolve(status);
    });
  });
}

function stopWifiAutomationMonitor(): void {
  if (wifiPollTimer) {
    clearInterval(wifiPollTimer);
    wifiPollTimer = null;
  }
}

function startWifiAutomationMonitor() {
  stopWifiAutomationMonitor();

  wifiPollTimer = setInterval(async () => {
    const newStatus = await pollWifiState();
    currentWifiStatus = newStatus;
    mainWindow?.webContents.send('on-wifi-status', newStatus);

    const decision = AutomationDecision.evaluate({
      settings: store.automation,
      wifiStatus: newStatus,
      currentConnectionStatus: currentConnectionState.status,
      isVpnRunning: currentConnectionState.status === 'connected',
      runningProfileId: currentConnectionState.activeProfile?.id || null,
      source: 'poll'
    });

    if (decision.updatedSettings !== store.automation) {
      store.automation = decision.updatedSettings;
      saveStore();
    }

    if (decision.logMessage) {
      addLog(decision.logLevel || 'INFO', 'Automation', decision.logMessage);
    }

    if (decision.action.type === 'START_VPN' || decision.action.type === 'SWITCH_VPN') {
      const action = decision.action as { type: string; profileId: string; reason: string };
      const target = store.profiles.find((p) => p.id === action.profileId);
      if (target) {
        addLog(
          'AUTO',
          'Automation',
          `${action.type === 'SWITCH_VPN' ? 'Switching' : 'Auto-starting'} VPN with "${target.name}" (${action.reason})`
        );
        startSingBox(target);
      }
    } else if (decision.action.type === 'STOP_VPN') {
      const stopAction = decision.action as { type: 'STOP_VPN'; reason: string };
      addLog('AUTO', 'Automation', `Auto-stopping VPN (${stopAction.reason})`);
      disconnectVpn(stopAction.reason);
    }
  }, 4000);
}

// ==========================================
// Latency Testing (TCP / TLS Socket)
// ==========================================
async function testServerLatency(profile: ServerProfile): Promise<number> {
  const start = Date.now();
  const timeoutMs = 3500;

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;

    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    const onFinish = (ms: number) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(ms);
    };

    timer = setTimeout(() => {
      onFinish(-1);
    }, timeoutMs + 100);

    socket.connect(profile.port, profile.address, () => {
      if (profile.tls === 'tls' || profile.tls === 'reality') {
        const tlsSocket = tls.connect(
          {
            socket,
            servername: profile.sni || profile.address,
            rejectUnauthorized: false
          },
          () => {
            const elapsed = Date.now() - start;
            tlsSocket.destroy();
            onFinish(elapsed);
          }
        );

        tlsSocket.on('error', () => onFinish(-1));
      } else {
        const elapsed = Date.now() - start;
        onFinish(elapsed);
      }
    });

    socket.on('error', () => onFinish(-1));
    socket.on('timeout', () => onFinish(-1));
  });
}

// ==========================================
// System Tray & Window Setup
// ==========================================
function updateTrayMenu(): void {
  if (!tray) return;

  const isConnected = currentConnectionState.status === 'connected';
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `v2rayDP Desktop - ${isConnected ? 'Connected (TUN)' : 'Disconnected'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isConnected ? 'Disconnect VPN' : 'Connect VPN',
      click: () => {
        if (isConnected) {
          disconnectVpn('Disconnected via Tray');
        } else {
          const active = store.profiles.find((p) => p.isSelected) || store.profiles[0];
          if (active) startSingBox(active);
        }
      }
    },
    {
      label: 'Open v2rayDP',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: async () => {
        isQuitting = true;
        await cleanupEverything();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`v2rayDP Desktop (${isConnected ? 'Connected - TUN' : 'Disconnected'})`);
}

function createMainWindow(): void {
  const iconPath = getAppIconPath();
  const iconImage = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;
  const shouldStartMinimized = store.settings.startMinimized || process.argv.includes('--minimized');

  mainWindow = new BrowserWindow({
    width: 1060,
    height: 740,
    minWidth: 880,
    minHeight: 620,
    backgroundColor: '#090D16',
    title: 'v2rayDP Desktop - VPN (TUN)',
    icon: iconImage,
    show: !shouldStartMinimized,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
  }

  mainWindow.on('close', async (event) => {
    if (!isQuitting && store.settings.closeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    } else {
      await cleanupEverything();
    }
  });

  (mainWindow as any).on('minimize', (event: any) => {
    if (store.settings.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createSystemTray(): void {
  const iconPath = getAppIconPath();
  if (!fs.existsSync(iconPath)) return;

  try {
    const trayImg = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayImg);

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });

    updateTrayMenu();
  } catch (err) {
    console.error('Failed to initialize tray:', err);
  }
}

// Guaranteed Cleanup on all exit paths
async function cleanupEverything(): Promise<void> {
  if (cleanedUp) return;
  cleanedUp = true;

  stopTrafficMonitor();
  stopWifiAutomationMonitor();
  await stopCurrentSingBoxProcess();
  await killStaleProcesses();
}

app.on('before-quit', async (event) => {
  if (!cleanedUp) {
    event.preventDefault();
    await cleanupEverything();
    app.quit();
  }
});

app.on('will-quit', async () => {
  await cleanupEverything();
});

(app as any).on('session-end', async () => {
  await cleanupEverything();
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  await cleanupEverything();
  process.exit(1);
});

process.on('unhandledRejection', async (err) => {
  console.error('Unhandled Rejection:', err);
  await cleanupEverything();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await cleanupEverything();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupEverything();
  process.exit(0);
});

// App Lifecycle
app.whenReady().then(async () => {
  // On startup kill any stale sing-box.exe processes
  await killStaleProcesses();

  // In dev mode, check admin elevation and inform user if not elevated
  if (!app.isPackaged && process.platform === 'win32') {
    const isElevated = await checkAdminElevation();
    if (!isElevated) {
      console.warn('\n⚠️ [Elevation Warning] Run the terminal as Administrator to enable Wintun adapter creation.\n');
    }
  }

  // Startup self-check: verify binaries exist
  const binPath = getSingBoxExecutablePath();
  const wintunPath = getWintunDllPath();
  if (!fs.existsSync(binPath) || (process.platform === 'win32' && !fs.existsSync(wintunPath))) {
    const missing = !fs.existsSync(binPath) ? binPath : wintunPath;
    dialog.showErrorBox(
      'v2rayDP Desktop - Missing Engine Binaries',
      `Required binary was not found:\n\n${missing}\n\nPlease run: node scripts/fetch-binaries.mjs`
    );
  }

  createMainWindow();
  createSystemTray();
  startWifiAutomationMonitor();

  // Configure Windows auto-start via Task Scheduler
  if (process.platform === 'win32') {
    syncWindowsStartupTask(Boolean(store.settings.startWithWindows), Boolean(store.settings.startMinimized));
  }

  // Auto-connect on app launch if enabled
  if (store.settings.autoConnectOnLaunch) {
    const active = store.profiles.find((p) => p.isSelected) || store.profiles[0];
    if (active) {
      setTimeout(() => startSingBox(active), 1500);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  verifyIpcHandlersRegistered();
});

// ==========================================
// IPC Handlers Implementation
// ==========================================
ipcMain.handle('get-profiles', async () => store.profiles);

ipcMain.handle('save-profile', async (_e, profileData: Partial<ServerProfile>) => {
  let updated: ServerProfile;
  if (profileData.id) {
    const idx = store.profiles.findIndex((p) => p.id === profileData.id);
    if (idx !== -1) {
      updated = { ...store.profiles[idx], ...profileData } as ServerProfile;
      store.profiles[idx] = updated;
    } else {
      updated = { ...profileData, id: profileData.id } as ServerProfile;
      store.profiles.push(updated);
    }
  } else {
    updated = {
      id: `prof-${Date.now()}`,
      name: 'New Node',
      protocol: 'vless',
      address: '127.0.0.1',
      port: 443,
      uuid: '',
      alterId: 0,
      security: 'none',
      network: 'tcp',
      headerType: 'none',
      host: '',
      path: '/',
      tls: 'reality',
      sni: '',
      alpn: '',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'chrome',
      spiderX: '/',
      serviceName: '',
      grpcMode: 'gun',
      allowInsecure: true,
      isSelected: store.profiles.length === 0,
      pingLatencyMs: -1,
      createdAt: Date.now(),
      ...profileData
    } as ServerProfile;
    store.profiles.push(updated);
  }
  saveStore();
  return updated;
});

ipcMain.handle('delete-profile', async (_e, id: string) => {
  store.profiles = store.profiles.filter((p) => p.id !== id);
  if (store.profiles.length > 0 && !store.profiles.some((p) => p.isSelected)) {
    store.profiles[0].isSelected = true;
  }
  saveStore();
  return true;
});

ipcMain.handle('select-profile', async (_e, id: string) => {
  let selected: ServerProfile | null = null;
  store.profiles.forEach((p) => {
    p.isSelected = p.id === id;
    if (p.isSelected) selected = p;
  });
  saveStore();
  if (selected && currentConnectionState.status === 'connected') {
    startSingBox(selected);
  }
  return true;
});

ipcMain.handle('duplicate-profile', async (_e, id: string) => {
  const target = store.profiles.find((p) => p.id === id);
  if (!target) return null;

  const cloned: ServerProfile = {
    ...target,
    id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: `${target.name} (Copy)`,
    isSelected: false,
    pingLatencyMs: -1,
    createdAt: Date.now()
  };

  store.profiles.push(cloned);
  saveStore();
  return cloned;
});

ipcMain.handle('import-profiles-text', async (_e, text: string) => {
  const lines = (text || '').split(/\r?\n/);
  let added = 0;
  let failed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (
      trimmed.toLowerCase().startsWith('vless://') ||
      trimmed.toLowerCase().startsWith('vmess://') ||
      trimmed.toLowerCase().startsWith('trojan://')
    ) {
      try {
        const parsed = VmessLinkParser.parse(trimmed);
        parsed.id = `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        parsed.createdAt = Date.now();
        parsed.isSelected = store.profiles.length === 0;
        store.profiles.push(parsed);
        added++;
      } catch {
        failed++;
      }
    }
  }

  saveStore();
  return { added, failed };
});

ipcMain.handle('export-profiles-json', async () => {
  return JSON.stringify(store.profiles, null, 2);
});

ipcMain.handle('import-profiles-json', async (_e, jsonStr: string) => {
  let added = 0;
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(jsonStr);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of list) {
      if (
        item.address &&
        item.port &&
        item.uuid &&
        (item.protocol === 'vless' || item.protocol === 'vmess' || item.protocol === 'trojan')
      ) {
        const profile: ServerProfile = {
          id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name || 'Imported Node',
          protocol: item.protocol,
          address: item.address,
          port: item.port,
          uuid: item.uuid,
          alterId: item.alterId || 0,
          security: item.security || 'none',
          network: item.network || 'tcp',
          headerType: item.headerType || 'none',
          host: item.host || '',
          path: item.path || '/',
          tls: item.tls || 'none',
          sni: item.sni || '',
          alpn: item.alpn || '',
          flow: item.flow || '',
          publicKey: item.publicKey || '',
          shortId: item.shortId || '',
          fingerprint: item.fingerprint || 'chrome',
          spiderX: item.spiderX || '/',
          serviceName: item.serviceName || '',
          grpcMode: item.grpcMode || 'gun',
          allowInsecure: true,
          isSelected: store.profiles.length === 0,
          pingLatencyMs: -1,
          createdAt: Date.now()
        };
        store.profiles.push(profile);
        added++;
      } else {
        errors.push(`Invalid node config for ${item.name || 'unnamed'}`);
      }
    }

    saveStore();
  } catch (err: unknown) {
    errors.push(`JSON parse error: ${(err as Error).message}`);
  }

  return { added, errors };
});

ipcMain.handle('start-vpn', async (_e, profileId?: string) => {
  const target = profileId
    ? store.profiles.find((p) => p.id === profileId)
    : store.profiles.find((p) => p.isSelected) || store.profiles[0];
  if (!target) return false;

  store.automation.manualConnectedProfileId = target.id;
  store.automation.manualConnectedNetworkKey = currentWifiStatus.connected
    ? `WIFI:${AutomationDecision.cleanSsid(currentWifiStatus.ssid) || '<no-ssid>'}`
    : 'NONE:none';
  store.automation.manualOverrideSuppressed = false;
  saveStore();

  return await startSingBox(target);
});

ipcMain.handle('stop-vpn', async (_e, reason?: string) => {
  store.automation.manualOverrideSuppressed = true;
  store.automation.manualOverrideReason = reason || 'Manual disconnect';
  store.automation.manualOverrideNetworkKey = currentWifiStatus.connected
    ? `WIFI:${AutomationDecision.cleanSsid(currentWifiStatus.ssid) || '<no-ssid>'}`
    : 'NONE:none';
  store.automation.manualConnectedProfileId = null;
  store.automation.manualConnectedNetworkKey = null;
  saveStore();

  await disconnectVpn(reason || 'User clicked Disconnect');
  return true;
});

ipcMain.handle('reset-manual-override', async () => {
  store.automation.manualOverrideSuppressed = false;
  store.automation.manualOverrideReason = '';
  store.automation.manualOverrideNetworkKey = null;
  store.automation.manualConnectedProfileId = null;
  store.automation.manualConnectedNetworkKey = null;
  saveStore();
  addLog('AUTO', 'Automation', 'Manual overrides cleared by user');
  return true;
});

ipcMain.handle('get-connection-state', async () => currentConnectionState);
ipcMain.handle('get-traffic-stats', async () => trafficStats);

ipcMain.handle('test-latency', async (_e, profileId: string) => {
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) return -1;
  const ping = await testServerLatency(profile);
  profile.pingLatencyMs = ping;
  profile.lastPingTimestamp = Date.now();
  saveStore();
  return ping;
});

ipcMain.handle('test-all-latencies', async () => {
  const results: Record<string, number> = {};
  for (const p of store.profiles) {
    const ping = await testServerLatency(p);
    p.pingLatencyMs = ping;
    p.lastPingTimestamp = Date.now();
    results[p.id] = ping;
  }
  saveStore();
  return results;
});

ipcMain.handle('get-automation-settings', async () => store.automation);
ipcMain.handle('save-automation-settings', async (_e, settings: AutomationSettings) => {
  store.automation = settings;
  saveStore();
  return true;
});

ipcMain.handle('get-wifi-status', async () => currentWifiStatus);

ipcMain.handle('get-hotspot-info', async () => {
  const interfaces = os.networkInterfaces();
  const ipAddresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const netInfo of interfaces[name] || []) {
      if (netInfo.family === 'IPv4' && !netInfo.internal) {
        ipAddresses.push(netInfo.address);
      }
    }
  }
  return {
    isSharing: store.hotspot.isHotspotSharingEnabled,
    socksPort: store.hotspot.hotspotProxyPort || 10808,
    httpPort: store.hotspot.hotspotProxyPort || 10808,
    ipAddresses: ipAddresses.length > 0 ? ipAddresses : ['192.168.1.100']
  };
});

ipcMain.handle('save-hotspot-settings', async (_e, settings: HotspotSettings) => {
  store.hotspot = settings;
  saveStore();
  await restartRunningProfileIfActive();
  return true;
});

ipcMain.handle('open-hotspot-settings', async () => {
  shell.openExternal('ms-settings:network-mobilehotspot');
  return true;
});

ipcMain.handle('add-firewall-rule', async (_e, port: number) => {
  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -Command "Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\\\"v2rayDP Hotspot Share\\\" dir=in action=allow protocol=TCP localport=${port}' -Verb RunAs"`;
    exec(cmd, (err) => {
      if (err) {
        resolve({ success: false, message: `Firewall elevation failed: ${err.message}` });
      } else {
        resolve({ success: true, message: `Firewall inbound rule added for port ${port}` });
      }
    });
  });
});

ipcMain.handle('remove-firewall-rule', async (_e, port: number) => {
  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -Command "Start-Process netsh -ArgumentList 'advfirewall firewall delete rule name=\\\"v2rayDP Hotspot Share\\\"' -Verb RunAs"`;
    exec(cmd, (err) => {
      if (err) {
        resolve({ success: false, message: `Firewall rule deletion failed: ${err.message}` });
      } else {
        resolve({ success: true, message: `Firewall inbound rule removed for port ${port}` });
      }
    });
  });
});

ipcMain.handle('get-block-settings', async () => store.block);

ipcMain.handle('save-block-settings', async (_e, settings: BlockSettings) => {
  store.block = settings;
  saveStore();
  await restartRunningProfileIfActive();
  return true;
});

ipcMain.handle('update-blocklists', async () => {
  if (!fs.existsSync(blocklistsDir)) {
    fs.mkdirSync(blocklistsDir, { recursive: true });
  }

  const sources = store.block.sources && store.block.sources.length > 0
    ? store.block.sources
    : (defaultSources as any[]);

  const uniqueDomains = new Set<string>();

  for (const source of sources) {
    try {
      addLog('INFO', 'BlockManager', `Downloading blocklist "${source.name}" from ${source.url}`);
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const bodyText = await res.text();
      const lines = bodyText.split('\n');
      const parsedDomains: string[] = [];

      for (const line of lines) {
        const domain = BlockManager.parseDomainFromLine(line);
        if (domain) {
          parsedDomains.push(domain);
          if (source.enabled) {
            uniqueDomains.add(domain);
          }
        }
      }

      source.domainCount = parsedDomains.length;
      const targetFile = path.join(blocklistsDir, `${source.id}.txt`);
      fs.writeFileSync(targetFile, parsedDomains.join('\n'), 'utf8');
      addLog('INFO', 'BlockManager', `Saved ${parsedDomains.length} domains for "${source.name}"`);
    } catch (err: unknown) {
      addLog('WARN', 'BlockManager', `Failed to update source "${source.name}": ${(err as Error).message}`);
    }
  }

  for (const rule of store.block.customRules || []) {
    const norm = BlockManager.normalizeCustomRule(rule);
    if (norm) uniqueDomains.add(norm);
  }

  store.block.sources = sources;
  store.block.totalDomains = uniqueDomains.size;
  store.block.lastUpdatedTimestamp = Date.now();
  saveStore();

  await restartRunningProfileIfActive();

  return { success: true, count: store.block.totalDomains };
});

ipcMain.handle('add-custom-block-rule', async (_e, rawDomain: string) => {
  const norm = BlockManager.normalizeCustomRule(rawDomain);
  if (!norm) return false;
  if (!store.block.customRules) store.block.customRules = [];
  if (store.block.customRules.includes(norm)) return false;

  store.block.customRules.push(norm);
  store.block.totalDomains = (store.block.totalDomains || 0) + 1;
  saveStore();
  addLog('INFO', 'BlockManager', `Added custom blocked domain: ${norm}`);

  await restartRunningProfileIfActive();
  return true;
});

ipcMain.handle('remove-custom-block-rule', async (_e, rawDomain: string) => {
  if (!store.block.customRules) return false;
  const initialLen = store.block.customRules.length;
  store.block.customRules = store.block.customRules.filter((d) => d !== rawDomain);

  if (store.block.customRules.length !== initialLen) {
    store.block.totalDomains = Math.max(0, (store.block.totalDomains || 1) - 1);
    saveStore();
    addLog('INFO', 'BlockManager', `Removed custom blocked domain: ${rawDomain}`);

    await restartRunningProfileIfActive();
    return true;
  }
  return false;
});

ipcMain.handle('get-desktop-settings', async () => store.settings);

ipcMain.handle('save-desktop-settings', async (_e, settings: DesktopSettings) => {
  store.settings = settings;
  saveStore();

  if (process.platform === 'win32') {
    syncWindowsStartupTask(Boolean(settings.startWithWindows), Boolean(settings.startMinimized));
  }

  await restartRunningProfileIfActive();
  return true;
});

ipcMain.handle('get-logs', async () => store.logs);
ipcMain.handle('clear-logs', async () => {
  store.logs = [];
  saveStore();
  return true;
});

ipcMain.handle('open-external-url', async (_e, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('reset-app', async () => {
  try {
    if (fs.existsSync(storeFilePath)) fs.unlinkSync(storeFilePath);
    if (fs.existsSync(singBoxConfigPath)) fs.unlinkSync(singBoxConfigPath);
  } catch {}
  store = loadStore();
  mainWindow?.reload();
  return true;
});

function verifyIpcHandlersRegistered(): void {
  const expectedChannels = [
    'get-profiles',
    'save-profile',
    'delete-profile',
    'select-profile',
    'duplicate-profile',
    'import-profiles-text',
    'export-profiles-json',
    'import-profiles-json',
    'start-vpn',
    'stop-vpn',
    'get-connection-state',
    'get-traffic-stats',
    'test-latency',
    'test-all-latencies',
    'get-automation-settings',
    'save-automation-settings',
    'get-wifi-status',
    'reset-manual-override',
    'get-hotspot-info',
    'save-hotspot-settings',
    'open-hotspot-settings',
    'add-firewall-rule',
    'remove-firewall-rule',
    'get-block-settings',
    'save-block-settings',
    'update-blocklists',
    'add-custom-block-rule',
    'remove-custom-block-rule',
    'get-desktop-settings',
    'save-desktop-settings',
    'reset-app',
    'get-logs',
    'clear-logs',
    'open-external-url'
  ];

  const registeredHandlers: string[] = (ipcMain as any)._invokeHandlers
    ? Array.from((ipcMain as any)._invokeHandlers.keys())
    : [];

  const missing = expectedChannels.filter((c) => !registeredHandlers.includes(c));
  if (missing.length > 0) {
    console.error(`[IPC DEV CHECK WARNING] Missing ipcMain handlers: ${missing.join(', ')}`);
  } else {
    console.log(`✓ Verified: All ${expectedChannels.length} IPC channels are registered in main.ts`);
  }
}
