/**
 * v2rayDP Desktop - Browser Mock API
 * Provides seamless in-browser preview inside AI Studio with realistic sing-box TUN simulation,
 * traffic ticker, Wi-Fi polling simulation, and localStorage persistence.
 */

import QRCode from 'qrcode';
import {
  ApiInterface,
  ServerProfile,
  ConnectionState,
  TrafficStats,
  AutomationSettings,
  HotspotSettings,
  HotspotInfo,
  BlockSettings,
  DesktopSettings,
  AppLog,
  WifiStatus
} from './types';
import { VmessLinkParser } from './VmessLinkParser';
import { BlockManager } from './BlockManager';
import { AutomationDecision } from './AutomationDecision';

const STORAGE_KEYS = {
  PROFILES: 'v2raydp_profiles',
  ACTIVE_PROFILE_ID: 'v2raydp_active_profile_id',
  AUTOMATION: 'v2raydp_automation',
  HOTSPOT: 'v2raydp_hotspot',
  BLOCK: 'v2raydp_block',
  SETTINGS: 'v2raydp_settings',
  EXCLUDE: 'v2raydp_exclude',
  LOGS: 'v2raydp_logs'
};

const DEFAULT_PROFILES: ServerProfile[] = [
  {
    id: 'prof-vless-reality-vision',
    name: 'SG - Singapore Fast [VLESS Reality]',
    protocol: 'vless',
    address: 'sg-fast.edge-node.net',
    port: 443,
    uuid: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    alterId: 0,
    security: 'none',
    network: 'tcp',
    headerType: 'none',
    host: 'sg-fast.edge-node.net',
    path: '/',
    tls: 'reality',
    sni: 'www.microsoft.com',
    alpn: 'h2,http/1.1',
    flow: 'xtls-rprx-vision',
    publicKey: '7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8=',
    shortId: '1a2b3c4d',
    fingerprint: 'chrome',
    spiderX: '/',
    serviceName: '',
    grpcMode: 'gun',
    allowInsecure: true,
    isSelected: true,
    pingLatencyMs: 42,
    lastPingTimestamp: Date.now() - 60000,
    createdAt: Date.now() - 86400000
  },
  {
    id: 'prof-vmess-ws-tls',
    name: 'US - Los Angeles Cloudflare [VMess WS]',
    protocol: 'vmess',
    address: 'us-la.cdn-proxy.org',
    port: 443,
    uuid: 'e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b',
    alterId: 0,
    security: 'auto',
    network: 'ws',
    headerType: 'none',
    host: 'us-la.cdn-proxy.org',
    path: '/v2ray-ws',
    tls: 'tls',
    sni: 'us-la.cdn-proxy.org',
    alpn: 'http/1.1',
    flow: '',
    publicKey: '',
    shortId: '',
    fingerprint: 'firefox',
    spiderX: '',
    serviceName: '',
    grpcMode: 'gun',
    allowInsecure: true,
    isSelected: false,
    pingLatencyMs: 148,
    lastPingTimestamp: Date.now() - 120000,
    createdAt: Date.now() - 172800000
  },
  {
    id: 'prof-vless-grpc-reality',
    name: 'DE - Frankfurt High-Speed [VLESS gRPC]',
    protocol: 'vless',
    address: 'de-fra.relay-cdn.net',
    port: 443,
    uuid: '9b8a7c6d-5e4f-3a2b-1c0d-e9f8a7b6c5d4',
    alterId: 0,
    security: 'none',
    network: 'grpc',
    headerType: 'none',
    host: 'de-fra.relay-cdn.net',
    path: '/vpn-grpc',
    tls: 'reality',
    sni: 'dl.google.com',
    alpn: 'h2',
    flow: '',
    publicKey: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789+AbCdEf=',
    shortId: '98765432',
    fingerprint: 'chrome',
    spiderX: '/',
    serviceName: 'vpn-grpc-service',
    grpcMode: 'gun',
    allowInsecure: true,
    isSelected: false,
    pingLatencyMs: 185,
    lastPingTimestamp: Date.now() - 180000,
    createdAt: Date.now() - 259200000
  }
];

const DEFAULT_AUTOMATION: AutomationSettings = {
  isAutomationGloballyEnabled: true,
  rules: [
    {
      id: 'rule-home-office',
      ssid: 'Home_Office_5G',
      action: 'connect',
      profileId: 'prof-vless-reality-vision',
      enabled: true
    },
    {
      id: 'rule-work-secure',
      ssid: 'Work_Secure_WiFi',
      action: 'connect',
      profileId: 'prof-vmess-ws-tls',
      enabled: true
    },
    {
      id: 'rule-cafe-public',
      ssid: 'Cafe_Guest_Free',
      action: 'do_not_connect',
      profileId: null,
      enabled: true
    }
  ],
  fallbackRule: {
    enabled: true,
    action: 'connect',
    profileId: 'prof-vless-reality-vision'
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
};

const DEFAULT_HOTSPOT: HotspotSettings = {
  isHotspotSharingEnabled: false,
  hotspotProxyPort: 10808,
  httpProxyPort: 10809,
  requireAuth: false,
  username: '',
  password: ''
};

const DEFAULT_SETTINGS: DesktopSettings = {
  mode: 'tun',
  primaryDns: '1.1.1.1',
  secondaryDns: '8.8.8.8',
  isBypassLan: true,
  logLevel: 'warning',
  minimizeToTray: true,
  closeToTray: true,
  startWithWindows: false,
  startMinimized: false,
  autoConnectOnLaunch: false,
  showNotifications: true
};

const DEFAULT_EXCLUDE = {
  enabled: true,
  bypassLan: true,
  bypassDirectDomains: ['ir', 'cn', 'local', 'localhost'],
  bypassDirectIps: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8'],
  bypassProcesses: ['discord.exe', 'steam.exe', 'qbittorrent.exe']
};

export function initMockApi(): ApiInterface {
  // State variables
  let connectionState: ConnectionState = {
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

  const wifiStatus: WifiStatus = {
    connected: true,
    ssid: 'Home_Office_5G',
    interfaceName: 'Wi-Fi (Intel Wi-Fi 6 AX201)',
    signalPercent: 94,
    locationPermissionHint: false
  };

  const stateListeners: Array<(state: ConnectionState) => void> = [];
  const trafficListeners: Array<(stats: TrafficStats) => void> = [];
  const wifiListeners: Array<(status: WifiStatus) => void> = [];
  const logListeners: Array<(log: AppLog) => void> = [];

  let trafficInterval: NodeJS.Timeout | null = null;
  let connectionTimer: NodeJS.Timeout | null = null;
  let startTime = 0;

  // Local helper for logs
  const addLog = (level: AppLog['level'], tag: string, message: string, triggerReason?: string) => {
    const log: AppLog = {
      id: Math.random().toString(36).substring(2, 10),
      timestamp: Date.now(),
      level,
      tag,
      message,
      triggerReason
    };
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
      stored.unshift(log);
      if (stored.length > 250) stored.pop();
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(stored));
    } catch {}
    logListeners.forEach(cb => cb(log));
  };

  // Pre-seed storage if empty
  if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(DEFAULT_PROFILES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUTOMATION)) {
    localStorage.setItem(STORAGE_KEYS.AUTOMATION, JSON.stringify(DEFAULT_AUTOMATION));
  }
  if (!localStorage.getItem(STORAGE_KEYS.HOTSPOT)) {
    localStorage.setItem(STORAGE_KEYS.HOTSPOT, JSON.stringify(DEFAULT_HOTSPOT));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BLOCK)) {
    localStorage.setItem(STORAGE_KEYS.BLOCK, JSON.stringify(BlockManager.getDefaultSettings()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    const initialLogs: AppLog[] = [
      {
        id: 'log-1',
        timestamp: Date.now() - 15000,
        level: 'INFO',
        tag: 'System',
        message: 'v2rayDP Desktop v1.0.0 initialized on Windows 11 x64'
      },
      {
        id: 'log-2',
        timestamp: Date.now() - 12000,
        level: 'AUTO',
        tag: 'Automation',
        message: 'Network Wi-Fi [Home_Office_5G] detected. Automation monitoring active.'
      },
      {
        id: 'log-3',
        timestamp: Date.now() - 8000,
        level: 'INFO',
        tag: 'AdBlock',
        message: 'Ad-blocking rules ready: 124,000 domains loaded from cache'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(initialLogs));
  }

  const broadcastState = (newState: ConnectionState) => {
    connectionState = newState;
    stateListeners.forEach(cb => cb(connectionState));
  };

  const startTrafficTicker = () => {
    if (trafficInterval) clearInterval(trafficInterval);
    trafficInterval = setInterval(() => {
      if (connectionState.status !== 'connected') return;

      const duration = Math.floor((Date.now() - startTime) / 1000);
      // Realistic oscillating throughput: 800 KB/s - 4.5 MB/s down, 100 KB/s - 800 KB/s up
      const downSpeed = Math.floor(800000 + Math.random() * 3700000);
      const upSpeed = Math.floor(100000 + Math.random() * 700000);

      trafficStats = {
        uploadSpeedBps: upSpeed,
        downloadSpeedBps: downSpeed,
        sessionTxBytes: trafficStats.sessionTxBytes + upSpeed,
        sessionRxBytes: trafficStats.sessionRxBytes + downSpeed,
        connectedDurationSeconds: duration
      };

      trafficListeners.forEach(cb => cb(trafficStats));

      // Periodically simulate ad-block increment
      if (Math.random() < 0.15) {
        try {
          const block = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCK) || '{}');
          if (block && block.isBlockingEnabled) {
            block.sessionBlockedCount = (block.sessionBlockedCount || 0) + 1;
            block.totalBlockedCount = (block.totalBlockedCount || 0) + 1;
            localStorage.setItem(STORAGE_KEYS.BLOCK, JSON.stringify(block));
            addLog('DEBUG', 'AdBlock', `Intercepted and sinkholed tracking request: adservice.google.com`, 'AdBlock Blackhole');
          }
        } catch {}
      }
    }, 1000);
  };

  const stopTrafficTicker = () => {
    if (trafficInterval) {
      clearInterval(trafficInterval);
      trafficInterval = null;
    }
    trafficStats = {
      uploadSpeedBps: 0,
      downloadSpeedBps: 0,
      sessionTxBytes: trafficStats.sessionTxBytes,
      sessionRxBytes: trafficStats.sessionRxBytes,
      connectedDurationSeconds: trafficStats.connectedDurationSeconds
    };
    trafficListeners.forEach(cb => cb(trafficStats));
  };

  const mockApi: ApiInterface = {
    // --- PROFILES ---
    getProfiles: async () => {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      return data ? JSON.parse(data) : DEFAULT_PROFILES;
    },

    saveProfile: async (profileData) => {
      const profiles = await mockApi.getProfiles();
      let updated: ServerProfile;
      if (profileData.id) {
        const index = profiles.findIndex(p => p.id === profileData.id);
        if (index !== -1) {
          updated = { ...profiles[index], ...profileData } as ServerProfile;
          profiles[index] = updated;
        } else {
          updated = { ...profileData, id: profileData.id } as ServerProfile;
          profiles.push(updated);
        }
      } else {
        const newId = `prof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        updated = {
          name: 'New Node',
          protocol: 'vless',
          address: '127.0.0.1',
          port: 443,
          uuid: '00000000-0000-0000-0000-000000000000',
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
          isSelected: profiles.length === 0,
          pingLatencyMs: -1,
          createdAt: Date.now(),
          ...profileData,
          id: newId
        } as ServerProfile;
        profiles.push(updated);
      }
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      addLog('INFO', 'Config', `Saved profile: "${updated.name}" (${updated.protocol.toUpperCase()})`);
      return updated;
    },

    deleteProfile: async (id) => {
      const profiles = await mockApi.getProfiles();
      const filtered = profiles.filter(p => p.id !== id);
      if (filtered.length > 0 && !filtered.some(p => p.isSelected)) {
        filtered[0].isSelected = true;
      }
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(filtered));
      addLog('INFO', 'Config', `Deleted profile ID: ${id}`);
      return true;
    },

    deleteAllProfiles: async () => {
      if (connectionState.status === 'connected' || connectionState.status === 'connecting') {
        await mockApi.stopVpn('User removed all configurations');
      }
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify([]));
      addLog('INFO', 'Config', 'Removed all profiles');
      return true;
    },

    selectProfile: async (id) => {
      const profiles = await mockApi.getProfiles();
      const selected = profiles.find(p => p.id === id) || null;
      profiles.forEach(p => {
        p.isSelected = p.id === id;
      });
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));

      if (selected) {
        addLog('INFO', 'Config', `Selected active profile: "${selected.name}"`);
        // If connected, seamless live reconnect to new profile!
        if (connectionState.status === 'connected') {
          addLog('AUTO', 'Core', `Profile switched while active. Reconnecting with "${selected.name}"…`);
          await mockApi.startVpn(selected.id);
        }
      }
      return true;
    },

    duplicateProfile: async (id) => {
      const profiles = await mockApi.getProfiles();
      const target = profiles.find(p => p.id === id);
      if (!target) throw new Error('Profile not found');
      const duplicated: ServerProfile = {
        ...target,
        id: `prof-${Date.now()}`,
        name: `${target.name} (Copy)`,
        isSelected: false,
        pingLatencyMs: -1,
        createdAt: Date.now()
      };
      profiles.push(duplicated);
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      addLog('INFO', 'Config', `Duplicated profile: "${duplicated.name}"`);
      return duplicated;
    },

    importProfilesFromText: async (rawText) => {
      let text = (rawText || '')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

      const trimmed = text.trim();
      if (
        !trimmed.includes('://') &&
        trimmed.length > 20 &&
        /^[A-Za-z0-9+/=]+$/.test(trimmed.replace(/\s+/g, ''))
      ) {
        try {
          const decoded = atob(trimmed.replace(/\s+/g, ''));
          if (decoded.includes('://')) {
            text = decoded;
          }
        } catch {}
      }

      const linkRegex = /(?:vless|vmess|trojan):\/\/[^\s"'<>]+/gi;
      const matches = text.match(linkRegex) || [];
      const profiles = await mockApi.getProfiles();
      let added = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const link of matches) {
        try {
          const parsed = VmessLinkParser.parse(link);
          const isDuplicate = profiles.some(
            (p) =>
              p.address === parsed.address &&
              p.port === parsed.port &&
              ((parsed.uuid && p.uuid === parsed.uuid) || (parsed.password && p.password === parsed.password))
          );

          if (isDuplicate) {
            skipped++;
            continue;
          }

          parsed.isSelected = profiles.length === 0;
          profiles.push(parsed);
          added++;
          addLog('INFO', 'app', `Imported profile: ${parsed.name}`);
        } catch (err: unknown) {
          const msg = (err as Error)?.message || 'Failed to parse link';
          errors.push(msg);
          addLog('WARN', 'app', `Import failed: ${msg}`);
        }
      }

      if (added > 0) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      }
      return { added, errors, skipped };
    },

    exportProfilesJson: async () => {
      const profiles = await mockApi.getProfiles();
      return JSON.stringify(profiles, null, 2);
    },

    importProfilesJson: async (jsonString) => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) throw new Error('Expected JSON array of ServerProfile objects');
        const profiles = await mockApi.getProfiles();
        let added = 0;
        for (const item of parsed) {
          if (item && item.address && item.port && item.uuid) {
            profiles.push({
              ...item,
              id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              isSelected: false,
              pingLatencyMs: -1,
              createdAt: Date.now()
            });
            added++;
          }
        }
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
        addLog('INFO', 'Import', `Restored ${added} profiles from JSON backup`);
        return { added, errors: [] };
      } catch (err: unknown) {
        return { added: 0, errors: [(err as Error).message] };
      }
    },

    // --- VPN CONNECTION ---
    startVpn: async (profileId) => {
      const profiles = await mockApi.getProfiles();
      const target = profileId
        ? profiles.find(p => p.id === profileId)
        : (profiles.find(p => p.isSelected) || profiles[0]);

      if (!target) {
        broadcastState({
          status: 'error',
          errorMessage: 'No server profile configured to start VPN',
          reason: 'Missing profile'
        });
        addLog('ERROR', 'VPN', 'Start failed: No server profiles configured');
        return false;
      }

      broadcastState({
        status: 'connecting',
        profileName: target.name,
        step: 'Generating sing-box configuration and verifying Wintun adapter…'
      });
      addLog('INFO', 'VPN', `Connecting to ${target.name} (${target.address}:${target.port})…`);

      if (connectionTimer) clearTimeout(connectionTimer);

      // Save manual connected profile if user initiated
      try {
        const auto = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTOMATION) || '{}');
        auto.manualConnectedProfileId = target.id;
        auto.manualConnectedNetworkKey = wifiStatus.connected
          ? `WIFI:${AutomationDecision.cleanSsid(wifiStatus.ssid) || '<no-ssid>'}`
          : 'NONE:none';
        auto.manualOverrideSuppressed = false;
        localStorage.setItem(STORAGE_KEYS.AUTOMATION, JSON.stringify(auto));
      } catch {}

      return new Promise<boolean>((resolve) => {
        connectionTimer = setTimeout(() => {
          startTime = Date.now();

          broadcastState({
            status: 'connected',
            profileName: target.name,
            activeProfile: target,
            connectedAt: startTime,
            virtualAdapterName: 'v2raydp-tun'
          });

          addLog('INFO', 'sing-box', 'sing-box VPN engine started successfully with Wintun adapter (v2raydp-tun)');
          addLog('INFO', 'TUN', 'Routing 100% of all device traffic through TUN interface (auto_route: true, strict_route: true)');

          startTrafficTicker();
          resolve(true);
        }, 600);
      });
    },

    stopVpn: async (reason = 'User requested disconnect') => {
      if (connectionTimer) clearTimeout(connectionTimer);
      stopTrafficTicker();

      // Set manual override on disconnect so automation will not reconnect on this same network
      try {
        const auto = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTOMATION) || '{}');
        auto.manualOverrideSuppressed = true;
        auto.manualOverrideReason = reason;
        auto.manualOverrideNetworkKey = wifiStatus.connected
          ? `WIFI:${AutomationDecision.cleanSsid(wifiStatus.ssid) || '<no-ssid>'}`
          : 'NONE:none';
        auto.manualConnectedProfileId = null;
        auto.manualConnectedNetworkKey = null;
        localStorage.setItem(STORAGE_KEYS.AUTOMATION, JSON.stringify(auto));
      } catch {}

      broadcastState({
        status: 'disconnected',
        reason
      });

      addLog('INFO', 'VPN', `Disconnected: ${reason}`);
      addLog('INFO', 'TUN', 'Virtual network adapter v2raydp-tun stopped and routes removed');
      return true;
    },

    getConnectionState: async () => connectionState,
    getTrafficStats: async () => trafficStats,

    onStateChange: (callback) => {
      stateListeners.push(callback);
      callback(connectionState);
      return () => {
        const idx = stateListeners.indexOf(callback);
        if (idx !== -1) stateListeners.splice(idx, 1);
      };
    },

    onTrafficStats: (callback) => {
      trafficListeners.push(callback);
      callback(trafficStats);
      return () => {
        const idx = trafficListeners.indexOf(callback);
        if (idx !== -1) trafficListeners.splice(idx, 1);
      };
    },

    // --- LATENCY TESTING ---
    testLatency: async (profileId) => {
      const profiles = await mockApi.getProfiles();
      const target = profiles.find(p => p.id === profileId);
      if (!target) return -1;

      // Realistic latency simulation (or socket in Electron)
      const baseMs = target.address.includes('sg') ? 38 : target.address.includes('us') ? 142 : 175;
      const jitter = Math.floor(Math.random() * 20) - 10;
      const ping = Math.max(15, baseMs + jitter);

      target.pingLatencyMs = ping;
      target.lastPingTimestamp = Date.now();
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      addLog('DEBUG', 'Ping', `Latency test for "${target.name}": ${ping} ms`);
      return ping;
    },

    testAllLatencies: async () => {
      const profiles = await mockApi.getProfiles();
      const results: Record<string, number> = {};
      for (const p of profiles) {
        const baseMs = p.address.includes('sg') ? 38 : p.address.includes('us') ? 142 : 175;
        const jitter = Math.floor(Math.random() * 25) - 10;
        const ping = Math.max(15, baseMs + jitter);
        p.pingLatencyMs = ping;
        p.lastPingTimestamp = Date.now();
        results[p.id] = ping;
      }
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      addLog('INFO', 'Ping', `Completed ping tests for all ${profiles.length} profiles`);
      return results;
    },

    // --- AUTOMATION ---
    getAutomationSettings: async () => {
      const data = localStorage.getItem(STORAGE_KEYS.AUTOMATION);
      return data ? JSON.parse(data) : DEFAULT_AUTOMATION;
    },

    saveAutomationSettings: async (settings) => {
      localStorage.setItem(STORAGE_KEYS.AUTOMATION, JSON.stringify(settings));
      addLog('INFO', 'Automation', 'Updated automation settings');
      return true;
    },

    getWifiStatus: async () => wifiStatus,

    onWifiStatusChange: (callback) => {
      wifiListeners.push(callback);
      callback(wifiStatus);
      return () => {
        const idx = wifiListeners.indexOf(callback);
        if (idx !== -1) wifiListeners.splice(idx, 1);
      };
    },

    resetManualOverride: async () => {
      const settings = await mockApi.getAutomationSettings();
      settings.manualOverrideSuppressed = false;
      settings.manualOverrideReason = '';
      settings.manualOverrideNetworkKey = null;
      settings.manualConnectedProfileId = null;
      settings.manualConnectedNetworkKey = null;
      await mockApi.saveAutomationSettings(settings);
      addLog('AUTO', 'Automation', 'Manual overrides reset. Automation active.');
    },

    // --- HOTSPOT ---
    getHotspotInfo: async () => {
      const hotspot: HotspotSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOTSPOT) || '{}');
      return {
        isSharing: Boolean(hotspot.isHotspotSharingEnabled),
        socksPort: hotspot.hotspotProxyPort || 10808,
        httpPort: hotspot.hotspotProxyPort || 10808,
        ipAddresses: ['192.168.1.105', '192.168.137.1', '10.0.0.42']
      };
    },

    saveHotspotSettings: async (settings) => {
      localStorage.setItem(STORAGE_KEYS.HOTSPOT, JSON.stringify(settings));
      addLog('INFO', 'Hotspot', `Hotspot sharing ${settings.isHotspotSharingEnabled ? 'ENABLED (0.0.0.0)' : 'DISABLED'}`);
      if (connectionState.status === 'connected') {
        addLog('AUTO', 'Core', 'Restarting sing-box to apply hotspot listener binding…');
        await mockApi.startVpn(connectionState.activeProfile?.id);
      }
      return true;
    },

    openHotspotSettings: async () => {
      addLog('INFO', 'Hotspot', 'Opened Windows Mobile Hotspot settings (ms-settings:network-mobilehotspot)');
      return true;
    },

    addFirewallRule: async (port) => {
      addLog('INFO', 'Firewall', `Added Windows Firewall inbound rule for TCP port ${port} (v2rayDP Hotspot Share)`);
      return {
        success: true,
        message: `Successfully configured Windows Defender Firewall inbound rule for port ${port}.`
      };
    },

    removeFirewallRule: async (port) => {
      addLog('INFO', 'Firewall', `Removed Windows Firewall inbound rule for TCP port ${port}`);
      return {
        success: true,
        message: `Successfully removed Windows Defender Firewall inbound rule for port ${port}.`
      };
    },

    // --- AD BLOCKING ---
    getBlockSettings: async () => {
      const data = localStorage.getItem(STORAGE_KEYS.BLOCK);
      return data ? JSON.parse(data) : BlockManager.getDefaultSettings();
    },

    saveBlockSettings: async (settings) => {
      localStorage.setItem(STORAGE_KEYS.BLOCK, JSON.stringify(settings));
      addLog('INFO', 'AdBlock', `Updated Ad Blocking settings (enabled: ${settings.isBlockingEnabled})`);
      if (connectionState.status === 'connected') {
        addLog('AUTO', 'Core', 'Updated sing-box ad-block rule-set filters');
        await mockApi.startVpn(connectionState.activeProfile?.id);
      }
      return true;
    },

    updateBlocklists: async () => {
      addLog('INFO', 'AdBlock', 'Downloading latest hosts and domain blocklists…');
      await new Promise(r => setTimeout(r, 1200));
      const current = await mockApi.getBlockSettings();
      current.lastUpdatedTimestamp = Date.now();
      current.totalDomains = 142580;
      await mockApi.saveBlockSettings(current);
      addLog('INFO', 'AdBlock', `Blocklists successfully updated: 142,580 domains merged and deduplicated`);
      return { success: true, count: 142580 };
    },

    addCustomBlockRule: async (rawDomain) => {
      const norm = BlockManager.normalizeCustomRule(rawDomain);
      if (!norm) return false;
      const settings = await mockApi.getBlockSettings();
      if (settings.customRules.includes(norm)) return false;
      settings.customRules.unshift(norm);
      await mockApi.saveBlockSettings(settings);
      addLog('INFO', 'AdBlock', `Added custom blocked domain: ${norm}`);
      return true;
    },

    removeCustomBlockRule: async (domain) => {
      const settings = await mockApi.getBlockSettings();
      const idx = settings.customRules.indexOf(domain);
      if (idx === -1) return false;
      settings.customRules.splice(idx, 1);
      await mockApi.saveBlockSettings(settings);
      addLog('INFO', 'AdBlock', `Removed custom blocked domain: ${domain}`);
      return true;
    },

    // --- DESKTOP SETTINGS ---
    getDesktopSettings: async () => {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    },

    saveDesktopSettings: async (settings) => {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      addLog('INFO', 'Settings', 'Saved desktop configuration');
      return true;
    },

    resetApp: async () => {
      localStorage.clear();
      addLog('WARN', 'System', 'Application reset to factory defaults');
      window.location.reload();
      return true;
    },

    // --- LOGS ---
    getLogs: async () => {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    },

    clearLogs: async () => {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
      return true;
    },

    onLog: (callback) => {
      logListeners.push(callback);
      return () => {
        const idx = logListeners.indexOf(callback);
        if (idx !== -1) logListeners.splice(idx, 1);
      };
    },

    // --- EXCLUDE / SPLIT TUNNELING ---
    getExcludeSettings: async () => {
      const data = localStorage.getItem(STORAGE_KEYS.EXCLUDE);
      return data ? JSON.parse(data) : DEFAULT_EXCLUDE;
    },

    saveExcludeSettings: async (settings) => {
      localStorage.setItem(STORAGE_KEYS.EXCLUDE, JSON.stringify(settings));
      addLog('INFO', 'Routing', 'Saved exclusion / split tunneling settings');
      return true;
    },

    // --- ELEVATION & CLIPBOARD ---
    checkAdminElevation: async () => {
      return true;
    },

    restartAsAdmin: async () => {
      addLog('INFO', 'System', 'Relaunching process as Administrator...');
      return true;
    },

    readClipboardText: async () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return '';
        }
      }
      return '';
    },

    // --- IP & ROUTING CHECK ---
    checkPublicIp: async (forceFresh = false) => {
      const isConnected = connectionState.status === 'connected';
      if (isConnected) {
        return {
          ip: '104.28.19.45',
          country: 'Singapore',
          countryCode: 'SG',
          city: 'Singapore',
          region: 'Central',
          isp: 'Cloudflare, Inc.',
          org: 'Cloudflare',
          flag: '🇸🇬',
          isVpn: true,
          queryTimestamp: Date.now()
        };
      }
      return {
        ip: '185.220.101.5',
        country: 'Germany',
        countryCode: 'DE',
        city: 'Frankfurt',
        region: 'Hesse',
        isp: 'Deutsche Telekom AG',
        org: 'Deutsche Telekom',
        flag: '🇩🇪',
        isVpn: false,
        queryTimestamp: Date.now()
      };
    },

    getRealIp: async () => {
      return {
        ip: '185.220.101.5',
        country: 'Germany',
        countryCode: 'DE',
        city: 'Frankfurt',
        region: 'Hesse',
        isp: 'Deutsche Telekom AG',
        org: 'Deutsche Telekom',
        flag: '🇩🇪',
        isVpn: false,
        queryTimestamp: Date.now()
      };
    },

    testVpnRouting: async () => {
      const isConnected = connectionState.status === 'connected';
      return {
        adapterUp: isConnected,
        adapterName: isConnected ? 'v2raydp-tun' : 'None',
        mode: 'tun',
        realIp: '185.220.101.5',
        vpnIp: isConnected ? '104.28.19.45' : '185.220.101.5',
        ipChanged: isConnected,
        dnsServers: ['1.1.1.1', '8.8.8.8'],
        dnsLeakDetected: false,
        ipv6LeakDetected: false,
        latencyMs: isConnected ? 42 : 12,
        testedAt: Date.now()
      };
    },

    resolveServerCountry: async (address: string) => {
      if (address.includes('sg') || address.includes('singapore')) {
        return { country: 'Singapore', countryCode: 'SG', isp: 'DigitalOcean', isCdn: false };
      }
      if (address.includes('us') || address.includes('la')) {
        return { country: 'United States', countryCode: 'US', isp: 'Cloudflare, Inc.', isCdn: true };
      }
      if (address.includes('de') || address.includes('fra')) {
        return { country: 'Germany', countryCode: 'DE', isp: 'Hetzner Online GmbH', isCdn: false };
      }
      return { country: 'Global Node', countryCode: 'UN', isp: 'Global Anycast', isCdn: true };
    },

    // --- SYSTEM HELPERS ---
    openExternalUrl: async (url) => {
      window.open(url, '_blank');
    },

    copyToClipboard: async (text) => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    },

    generateQrCode: async (text) => {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 250,
        color: {
          dark: '#00F0FF',
          light: '#0F172A'
        }
      });
    }
  };

  return mockApi;
}

// Automatically attach to window.api in browser preview if not inside Electron
if (typeof window !== 'undefined' && !window.api) {
  window.api = initMockApi();
}
