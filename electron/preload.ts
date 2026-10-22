/**
 * v2rayDP Desktop - Electron Preload Script
 * Secure IPC Bridge exposing window.api to the renderer
 */

import { contextBridge, ipcRenderer, clipboard } from 'electron';
import QRCode from 'qrcode';
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

contextBridge.exposeInMainWorld('api', {
  // Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile: Partial<ServerProfile>) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (id: string) => ipcRenderer.invoke('delete-profile', id),
  deleteAllProfiles: () => ipcRenderer.invoke('delete-all-profiles'),
  selectProfile: (id: string) => ipcRenderer.invoke('select-profile', id),
  duplicateProfile: (id: string) => ipcRenderer.invoke('duplicate-profile', id),
  importProfilesFromText: (text: string) => ipcRenderer.invoke('import-profiles-text', text),
  exportProfilesJson: () => ipcRenderer.invoke('export-profiles-json'),
  importProfilesJson: (json: string) => ipcRenderer.invoke('import-profiles-json', json),

  // Connection
  startVpn: (profileId?: string) => ipcRenderer.invoke('start-vpn', profileId),
  stopVpn: (reason?: string) => ipcRenderer.invoke('stop-vpn', reason),
  getConnectionState: () => ipcRenderer.invoke('get-connection-state'),
  getTrafficStats: () => ipcRenderer.invoke('get-traffic-stats'),
  onStateChange: (callback: (state: ConnectionState) => void) => {
    const handler = (_e: unknown, state: ConnectionState) => callback(state);
    ipcRenderer.on('on-state-change', handler);
    return () => ipcRenderer.removeListener('on-state-change', handler);
  },
  onTrafficStats: (callback: (stats: TrafficStats) => void) => {
    const handler = (_e: unknown, stats: TrafficStats) => callback(stats);
    ipcRenderer.on('on-traffic-stats', handler);
    return () => ipcRenderer.removeListener('on-traffic-stats', handler);
  },

  // Latency
  testLatency: (profileId: string) => ipcRenderer.invoke('test-latency', profileId),
  testAllLatencies: () => ipcRenderer.invoke('test-all-latencies'),

  // Automation
  getAutomationSettings: () => ipcRenderer.invoke('get-automation-settings'),
  saveAutomationSettings: (settings: AutomationSettings) => ipcRenderer.invoke('save-automation-settings', settings),
  getWifiStatus: () => ipcRenderer.invoke('get-wifi-status'),
  onWifiStatusChange: (callback: (status: WifiStatus) => void) => {
    const handler = (_e: unknown, status: WifiStatus) => callback(status);
    ipcRenderer.on('on-wifi-status', handler);
    return () => ipcRenderer.removeListener('on-wifi-status', handler);
  },
  resetManualOverride: () => ipcRenderer.invoke('reset-manual-override'),

  // Hotspot
  getHotspotInfo: () => ipcRenderer.invoke('get-hotspot-info'),
  saveHotspotSettings: (settings: HotspotSettings) => ipcRenderer.invoke('save-hotspot-settings', settings),
  openHotspotSettings: () => ipcRenderer.invoke('open-hotspot-settings'),
  addFirewallRule: (port: number) => ipcRenderer.invoke('add-firewall-rule', port),
  removeFirewallRule: (port: number) => ipcRenderer.invoke('remove-firewall-rule', port),

  // Ad Blocking
  getBlockSettings: () => ipcRenderer.invoke('get-block-settings'),
  saveBlockSettings: (settings: BlockSettings) => ipcRenderer.invoke('save-block-settings', settings),
  updateBlocklists: () => ipcRenderer.invoke('update-blocklists'),
  addCustomBlockRule: (domain: string) => ipcRenderer.invoke('add-custom-block-rule', domain),
  removeCustomBlockRule: (domain: string) => ipcRenderer.invoke('remove-custom-block-rule', domain),

  // Settings
  getDesktopSettings: () => ipcRenderer.invoke('get-desktop-settings'),
  saveDesktopSettings: (settings: DesktopSettings) => ipcRenderer.invoke('save-desktop-settings', settings),
  resetApp: () => ipcRenderer.invoke('reset-app'),

  // Logs
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  onLog: (callback: (log: AppLog) => void) => {
    const handler = (_e: unknown, log: AppLog) => callback(log);
    ipcRenderer.on('on-log', handler);
    return () => ipcRenderer.removeListener('on-log', handler);
  },

  // Exclude / Split Tunneling
  getExcludeSettings: () => ipcRenderer.invoke('get-exclude-settings'),
  saveExcludeSettings: (settings: any) => ipcRenderer.invoke('save-exclude-settings', settings),

  // Elevation & Clipboard
  checkAdminElevation: () => ipcRenderer.invoke('check-admin-elevation'),
  restartAsAdmin: () => ipcRenderer.invoke('restart-as-admin'),
  readClipboardText: async () => {
    try {
      const text = await ipcRenderer.invoke('read-clipboard-text');
      if (typeof text === 'string') return text;
    } catch {}
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {}
    return '';
  },

  // IP & Routing Check
  checkPublicIp: (forceFresh?: boolean) => ipcRenderer.invoke('check-public-ip', forceFresh),
  getRealIp: () => ipcRenderer.invoke('get-real-ip'),
  testVpnRouting: () => ipcRenderer.invoke('test-vpn-routing'),
  resolveServerCountry: (address: string) => ipcRenderer.invoke('resolve-server-country', address),

  // Helpers
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  copyToClipboard: async (text: string) => {
    clipboard.writeText(text);
  },
  generateQrCode: async (text: string) => {
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
});

