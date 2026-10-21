import React, { useState, useEffect } from 'react';
import './core/mockApi'; // Ensures window.api is attached if running in standard browser/AI Studio preview
import {
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
} from './core/types';
import { TopBar, ActiveTab } from './components/TopBar';
import { DashboardScreen } from './screens/DashboardScreen';
import { AutomationScreen } from './screens/AutomationScreen';
import { HotspotScreen } from './screens/HotspotScreen';
import { BlockingScreen } from './screens/BlockingScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Core application states
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reason: 'Idle',
    activeProfile: null
  });
  const [trafficStats, setTrafficStats] = useState<TrafficStats>({
    uploadSpeedBps: 0,
    downloadSpeedBps: 0,
    sessionTxBytes: 0,
    sessionRxBytes: 0,
    connectedDurationSeconds: 0
  });
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
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
  });
  const [wifiStatus, setWifiStatus] = useState<WifiStatus>({
    connected: false,
    ssid: null
  });
  const [hotspotSettings, setHotspotSettings] = useState<HotspotSettings>({
    isHotspotSharingEnabled: false,
    hotspotProxyPort: 10808,
    httpProxyPort: 10809,
    requireAuth: false
  });
  const [hotspotInfo, setHotspotInfo] = useState<HotspotInfo>({
    isSharing: false,
    socksPort: 10808,
    httpPort: 10809,
    ipAddresses: ['192.168.1.100']
  });
  const [blockSettings, setBlockSettings] = useState<BlockSettings>({
    isBlockingEnabled: true,
    sources: [],
    customRules: [],
    totalDomains: 0,
    lastUpdatedTimestamp: null,
    sessionBlockedCount: null,
    totalBlockedCount: null
  });
  const [desktopSettings, setDesktopSettings] = useState<DesktopSettings>({
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
  });
  const [logs, setLogs] = useState<AppLog[]>([]);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Initial Data Load & Event Subscriptions
  useEffect(() => {
    if (!window.api) return;

    // Load initial data
    window.api.getProfiles().then(setProfiles);
    window.api.getConnectionState().then(setConnectionState);
    window.api.getTrafficStats().then(setTrafficStats);
    window.api.getAutomationSettings().then(setAutomationSettings);
    window.api.getWifiStatus().then(setWifiStatus);
    window.api.getHotspotInfo().then(setHotspotInfo);
    window.api.getBlockSettings().then(setBlockSettings);
    window.api.getDesktopSettings().then(setDesktopSettings);
    window.api.getLogs().then(setLogs);

    // Subscriptions
    const unsubState = window.api.onStateChange((state) => {
      setConnectionState(state);
    });

    const unsubTraffic = window.api.onTrafficStats((stats) => {
      setTrafficStats(stats);
    });

    const unsubWifi = window.api.onWifiStatusChange((status) => {
      setWifiStatus(status);
    });

    const unsubLogs = window.api.onLog((log) => {
      setLogs((prev) => [log, ...prev.slice(0, 299)]);
    });

    return () => {
      unsubState();
      unsubTraffic();
      unsubWifi();
      unsubLogs();
    };
  }, []);

  // Handler functions
  const handleStartVpn = async (profileId?: string) => {
    if (!window.api) return false;
    const ok = await window.api.startVpn(profileId);
    if (ok) showToast('Connecting to proxy…', 'info');
    return ok;
  };

  const handleStopVpn = async () => {
    if (!window.api) return false;
    const ok = await window.api.stopVpn('User tapped Disconnect');
    if (ok) showToast('Disconnected from proxy', 'info');
    return ok;
  };

  const handleSelectProfile = async (id: string) => {
    if (!window.api) return false;
    const ok = await window.api.selectProfile(id);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    return ok;
  };

  const handleSaveProfile = async (profileData: Partial<ServerProfile>) => {
    if (!window.api) return;
    await window.api.saveProfile(profileData);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    showToast('Profile saved successfully', 'success');
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.api) return false;
    const ok = await window.api.deleteProfile(id);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    showToast('Profile deleted', 'info');
    return ok;
  };

  const handleDuplicateProfile = async (id: string) => {
    if (!window.api) throw new Error('API unavailable');
    const dup = await window.api.duplicateProfile(id);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    showToast(`Duplicated: ${dup.name}`, 'success');
    return dup;
  };

  const handleTestPing = async (id: string) => {
    if (!window.api) return -1;
    const ms = await window.api.testLatency(id);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    return ms;
  };

  const handleTestAllPings = async () => {
    if (!window.api) return {};
    const results = await window.api.testAllLatencies();
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    showToast(`Tested latency for ${updated.length} nodes`, 'info');
    return results;
  };

  const handleImportClipboard = async () => {
    if (!window.api) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text || (!text.includes('vless://') && !text.includes('vmess://'))) {
        showToast('Clipboard does not contain vless:// or vmess:// links', 'error');
        return;
      }
      const res = await window.api.importProfilesFromText(text);
      if (res.added > 0) {
        const updated = await window.api.getProfiles();
        setProfiles(updated);
        showToast(`Imported ${res.added} node${res.added > 1 ? 's' : ''}`, 'success');
      } else if (res.errors.length > 0) {
        showToast(res.errors[0], 'error');
      }
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleImportFile = async (content: string) => {
    if (!window.api) return;
    try {
      let res = await window.api.importProfilesFromText(content);
      if (res.added === 0 && content.trim().startsWith('[')) {
        res = await window.api.importProfilesJson(content);
      }
      if (res.added > 0) {
        const updated = await window.api.getProfiles();
        setProfiles(updated);
        showToast(`Imported ${res.added} node${res.added > 1 ? 's' : ''}`, 'success');
      } else if (res.errors.length > 0) {
        showToast(res.errors[0], 'error');
      }
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleClearLogs = async () => {
    if (!window.api) return false;
    const ok = await window.api.clearLogs();
    setLogs([]);
    showToast('Logs cleared', 'info');
    return ok;
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectionState={connectionState}
        hotspotEnabled={hotspotSettings.isHotspotSharingEnabled}
        adBlockEnabled={blockSettings.isBlockingEnabled}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardScreen
            connectionState={connectionState}
            trafficStats={trafficStats}
            profiles={profiles}
            logs={logs}
            onStartVpn={handleStartVpn}
            onStopVpn={handleStopVpn}
            onSelectProfile={handleSelectProfile}
            onSaveProfile={handleSaveProfile}
            onDeleteProfile={handleDeleteProfile}
            onDuplicateProfile={handleDuplicateProfile}
            onTestPing={handleTestPing}
            onTestAllPings={handleTestAllPings}
            onImportClipboard={handleImportClipboard}
            onImportFile={handleImportFile}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationScreen
            settings={automationSettings}
            desktopSettings={desktopSettings}
            wifiStatus={wifiStatus}
            profiles={profiles}
            onSaveSettings={async (newSettings) => {
              if (!window.api) return false;
              const ok = await window.api.saveAutomationSettings(newSettings);
              setAutomationSettings(newSettings);
              showToast('Automation settings saved', 'success');
              return ok;
            }}
            onSaveDesktopSettings={async (newSettings) => {
              if (!window.api) return false;
              const ok = await window.api.saveDesktopSettings(newSettings);
              setDesktopSettings(newSettings);
              showToast('Startup settings saved', 'success');
              return ok;
            }}
            onResetManualOverride={async () => {
              if (!window.api) return;
              await window.api.resetManualOverride();
              const s = await window.api.getAutomationSettings();
              setAutomationSettings(s);
              showToast('Manual override cleared', 'info');
            }}
          />
        )}

        {activeTab === 'hotspot' && (
          <HotspotScreen
            hotspotInfo={hotspotInfo}
            hotspotSettings={hotspotSettings}
            onSaveHotspotSettings={async (newSettings) => {
              if (!window.api) return false;
              const ok = await window.api.saveHotspotSettings(newSettings);
              setHotspotSettings(newSettings);
              const info = await window.api.getHotspotInfo();
              setHotspotInfo(info);
              showToast('Hotspot sharing settings saved', 'success');
              return ok;
            }}
            onOpenMobileHotspot={async () => {
              if (!window.api) return false;
              return await window.api.openHotspotSettings();
            }}
            onAddFirewallRule={async (port) => {
              if (!window.api) return { success: false, message: 'API unavailable' };
              return await window.api.addFirewallRule(port);
            }}
            onRemoveFirewallRule={async (port) => {
              if (!window.api) return { success: false, message: 'API unavailable' };
              return await window.api.removeFirewallRule(port);
            }}
          />
        )}

        {activeTab === 'blocking' && (
          <BlockingScreen
            blockSettings={blockSettings}
            onSaveSettings={async (newSettings) => {
              if (!window.api) return false;
              const ok = await window.api.saveBlockSettings(newSettings);
              setBlockSettings(newSettings);
              showToast('Ad blocking settings updated', 'success');
              return ok;
            }}
            onUpdateLists={async () => {
              if (!window.api) return { success: false, count: 0 };
              const res = await window.api.updateBlocklists();
              const s = await window.api.getBlockSettings();
              setBlockSettings(s);
              if (res.success) {
                showToast(`Updated ${res.count.toLocaleString()} blocked domains`, 'success');
              }
              return res;
            }}
            onAddCustomRule={async (domain) => {
              if (!window.api) return false;
              const ok = await window.api.addCustomBlockRule(domain);
              const s = await window.api.getBlockSettings();
              setBlockSettings(s);
              if (ok) showToast(`Added ${domain} to blocklist`, 'success');
              return ok;
            }}
            onRemoveCustomRule={async (domain) => {
              if (!window.api) return false;
              const ok = await window.api.removeCustomBlockRule(domain);
              const s = await window.api.getBlockSettings();
              setBlockSettings(s);
              showToast(`Removed ${domain}`, 'info');
              return ok;
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={desktopSettings}
            onSaveSettings={async (newSettings) => {
              if (!window.api) return false;
              const ok = await window.api.saveDesktopSettings(newSettings);
              setDesktopSettings(newSettings);
              showToast('Settings saved', 'success');
              return ok;
            }}
            onExportProfiles={async () => {
              if (!window.api) return '[]';
              return await window.api.exportProfilesJson();
            }}
            onImportProfiles={async (json) => {
              if (!window.api) return { added: 0, errors: ['API unavailable'] };
              const res = await window.api.importProfilesJson(json);
              const updated = await window.api.getProfiles();
              setProfiles(updated);
              return res;
            }}
            onResetApp={async () => {
              if (!window.api) return false;
              return await window.api.resetApp();
            }}
          />
        )}

        {activeTab === 'about' && <AboutScreen />}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xl border ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/70 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-red-950/95 border-red-500/70 text-red-300'
                : 'bg-cyan-950/95 border-cyan-500/70 text-cyan-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
