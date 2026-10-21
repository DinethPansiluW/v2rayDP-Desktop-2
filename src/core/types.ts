/**
 * v2rayDP Desktop - Core Data Models & Types
 * Ported from v2rayDP Android (ServerProfile.kt, ConnectionState.kt, AutomationSettings.kt, SocialLinks.kt)
 */

export interface ServerProfile {
  id: string;
  name: string;
  protocol: 'vless' | 'vmess' | 'trojan';
  address: string;
  port: number;
  uuid: string;
  password?: string; // for Trojan profiles or alternative credentials
  alterId: number; // 0 for VLESS, 0 or configured for VMess
  security: string; // "auto", "none", "aes-128-gcm", "chacha20-poly1305"
  network: 'tcp' | 'ws' | 'grpc' | 'h2';
  headerType: string; // "none", "http"
  host: string;
  path: string;
  tls: 'none' | 'tls' | 'reality';
  sni: string;
  alpn: string;
  flow: string; // e.g. "xtls-rprx-vision"
  publicKey: string; // pbk for Reality
  shortId: string; // sid for Reality
  fingerprint: string; // fp: chrome, firefox, safari, ios, random
  spiderX: string; // spx for Reality (e.g. / or custom)
  serviceName: string; // for gRPC transport
  grpcMode: string; // "gun", "multi"
  pinnedPeerCertSha256?: string; // pcs hash
  verifyPeerCertByName?: string; // vcn name
  allowInsecure?: boolean; // allowInsecure
  isSelected?: boolean;
  pingLatencyMs?: number; // -1 if failed or not tested
  lastPingTimestamp?: number;
  createdAt?: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  profileName?: string;
  activeProfile?: ServerProfile | null;
  connectedAt?: number;
  step?: string;
  reason?: string;
  errorMessage?: string;
  virtualAdapterName?: string;
  localSocksPort?: number;
  localHttpPort?: number;
}

export interface TrafficStats {
  uploadSpeedBps: number;
  downloadSpeedBps: number;
  sessionTxBytes: number;
  sessionRxBytes: number;
  connectedDurationSeconds: number;
}

export type WifiLeavePolicy = 'STOP_VPN' | 'KEEP_VPN';

export type RuleAction = 'connect' | 'do_not_connect';

export interface SsidRule {
  id: string;
  ssid: string; // case-insensitive exact match
  action: RuleAction; // 'connect' or 'do_not_connect'
  profileId: string | null; // Target profile ID when action is 'connect'
  enabled: boolean;
}

export interface FallbackRule {
  enabled: boolean; // Own ON/OFF switch: If OFF, VPN will NEVER auto-connect on networks without a specific rule
  action: RuleAction; // 'connect' or 'do_not_connect'
  profileId: string | null;
}

export interface AutomationSettings {
  isAutomationGloballyEnabled: boolean;

  // SSID -> Profile Rules
  rules: SsidRule[];
  fallbackRule: FallbackRule;

  // Leaving & Losing Wi-Fi policies
  autoStopOnWifiLeave: boolean;
  wifiLeavePolicy: WifiLeavePolicy; // "STOP_VPN" or "KEEP_VPN"
  autoStopOnWifiOff: boolean;
  autoReconnectOnWifiReturn: boolean;

  // Manual override suppression (persisted, network-scoped)
  manualOverrideSuppressed: boolean;
  manualOverrideReason: string;
  manualOverrideNetworkKey: string | null; // e.g. "WIFI:MyHomeNetwork"

  // Manual connect preservation: if user connected manually, do not change on same network
  manualConnectedProfileId: string | null;
  manualConnectedNetworkKey: string | null;

  // Stopped state tracking for auto-reconnect on return
  stoppedByLeaveWifiSsid: string | null;
}

export interface HotspotSettings {
  isHotspotSharingEnabled: boolean;
  hotspotProxyPort: number;
  httpProxyPort: number;
  requireAuth: boolean;
  username?: string;
  password?: string;
}

export interface BlocklistSource {
  id: string;
  name: string;
  description: string;
  url: string;
  format: 'hosts' | 'domains';
  enabled: boolean;
  domainCount: number;
}

export interface BlockSettings {
  isBlockingEnabled: boolean;
  sources: BlocklistSource[];
  customRules: string[];
  totalDomains: number;
  lastUpdatedTimestamp: number | null;
  sessionBlockedCount: number | null;
  totalBlockedCount: number | null;
}

export interface DesktopSettings {
  mode: 'tun'; // Sing-box TUN VPN
  primaryDns: string; // default 1.1.1.1
  secondaryDns: string; // default 8.8.8.8
  isBypassLan: boolean; // default true
  logLevel: 'warning' | 'info' | 'debug' | 'error' | 'none';
  minimizeToTray: boolean;
  closeToTray: boolean;
  startWithWindows: boolean;
  startMinimized: boolean;
  autoConnectOnLaunch: boolean;
  showNotifications?: boolean; // default true
}

export interface ExcludeSettings {
  enabled: boolean;
  bypassLan: boolean;
  bypassDirectDomains: string[];
  bypassDirectIps: string[];
  bypassProcesses: string[];
}

export interface AppLog {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AUTO' | 'DEBUG';
  tag: string;
  message: string;
  triggerReason?: string;
}

export interface WifiStatus {
  connected: boolean;
  ssid: string | null;
  interfaceName?: string;
  signalPercent?: number;
  locationPermissionHint?: boolean;
}

export interface HotspotInfo {
  isSharing: boolean;
  socksPort: number;
  httpPort: number;
  ipAddresses: string[];
}

export interface ApiInterface {
  // Profiles
  getProfiles: () => Promise<ServerProfile[]>;
  saveProfile: (profile: Partial<ServerProfile> & { id?: string }) => Promise<ServerProfile>;
  deleteProfile: (id: string) => Promise<boolean>;
  selectProfile: (id: string) => Promise<boolean>;
  duplicateProfile: (id: string) => Promise<ServerProfile>;
  importProfilesFromText: (text: string) => Promise<{ added: number; errors: string[]; skipped?: number }>;
  exportProfilesJson: () => Promise<string>;
  importProfilesJson: (jsonString: string) => Promise<{ added: number; errors: string[]; skipped?: number }>;

  // VPN Connection
  startVpn: (profileId?: string) => Promise<boolean>;
  stopVpn: (reason?: string) => Promise<boolean>;
  getConnectionState: () => Promise<ConnectionState>;
  getTrafficStats: () => Promise<TrafficStats>;
  onStateChange: (callback: (state: ConnectionState) => void) => () => void;
  onTrafficStats: (callback: (stats: TrafficStats) => void) => () => void;

  // Latency Testing
  testLatency: (profileId: string) => Promise<number>;
  testAllLatencies: () => Promise<Record<string, number>>;

  // Automation
  getAutomationSettings: () => Promise<AutomationSettings>;
  saveAutomationSettings: (settings: AutomationSettings) => Promise<boolean>;
  getWifiStatus: () => Promise<WifiStatus>;
  onWifiStatusChange: (callback: (status: WifiStatus) => void) => () => void;
  resetManualOverride: () => Promise<void>;

  // Exclude / Split Tunneling
  getExcludeSettings: () => Promise<ExcludeSettings>;
  saveExcludeSettings: (settings: ExcludeSettings) => Promise<boolean>;

  // Hotspot
  getHotspotInfo: () => Promise<HotspotInfo>;
  saveHotspotSettings: (settings: HotspotSettings) => Promise<boolean>;
  openHotspotSettings: () => Promise<boolean>;
  addFirewallRule: (port: number) => Promise<{ success: boolean; message: string }>;
  removeFirewallRule: (port: number) => Promise<{ success: boolean; message: string }>;

  // Ad Blocking
  getBlockSettings: () => Promise<BlockSettings>;
  saveBlockSettings: (settings: BlockSettings) => Promise<boolean>;
  updateBlocklists: () => Promise<{ success: boolean; count: number; error?: string }>;
  addCustomBlockRule: (domain: string) => Promise<boolean>;
  removeCustomBlockRule: (domain: string) => Promise<boolean>;

  // Desktop Settings
  getDesktopSettings: () => Promise<DesktopSettings>;
  saveDesktopSettings: (settings: DesktopSettings) => Promise<boolean>;
  resetApp: () => Promise<boolean>;

  // Elevation & Clipboard
  checkAdminElevation: () => Promise<boolean>;
  restartAsAdmin: () => Promise<boolean>;
  readClipboardText: () => Promise<string>;

  // Logs
  getLogs: () => Promise<AppLog[]>;
  clearLogs: () => Promise<boolean>;
  onLog: (callback: (log: AppLog) => void) => () => void;

  // System Helpers
  openExternalUrl: (url: string) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
  generateQrCode: (text: string) => Promise<string>; // returns data URL
}

declare global {
  interface Window {
    api?: ApiInterface;
  }
}

