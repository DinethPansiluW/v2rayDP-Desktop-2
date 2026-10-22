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
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardScreen } from './screens/DashboardScreen';
import { AutomationScreen } from './screens/AutomationScreen';
import { ExcludeScreen } from './screens/ExcludeScreen';
import { HotspotScreen } from './screens/HotspotScreen';
import { BlockingScreen } from './screens/BlockingScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { CheckCircle2, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isElevated, setIsElevated] = useState<boolean>(true);

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
    autoConnectOnLaunch: false,
    showNotifications: true
  });
  const [logs, setLogs] = useState<AppLog[]>([]);

  // Toast banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Initialization & Event Subscriptions
  useEffect(() => {
    const init = async () => {
      if (!window.api) return;

      try {
        const [p, c, t, a, w, h, hi, b, d, l] = await Promise.all([
          window.api.getProfiles(),
          window.api.getConnectionState(),
          window.api.getTrafficStats(),
          window.api.getAutomationSettings(),
          window.api.getWifiStatus(),
          window.api.getHotspotInfo(),
          window.api.getHotspotInfo(),
          window.api.getBlockSettings(),
          window.api.getDesktopSettings(),
          window.api.getLogs()
        ]);

        setProfiles(p || []);
        setConnectionState(c || { status: 'disconnected', reason: 'Idle', activeProfile: null });
        setTrafficStats(t || { uploadSpeedBps: 0, downloadSpeedBps: 0, sessionTxBytes: 0, sessionRxBytes: 0, connectedDurationSeconds: 0 });
        setAutomationSettings(a);
        setWifiStatus(w || { connected: false, ssid: null });
        setHotspotInfo(hi || { isSharing: false, socksPort: 10808, httpPort: 10809, ipAddresses: [] });
        setBlockSettings(b);
        setDesktopSettings(d);
        setLogs(l || []);

        if (window.api.checkAdminElevation) {
          const elevated = await window.api.checkAdminElevation();
          setIsElevated(elevated);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    init();

    // Stream listeners
    const unbindState = window.api?.onStateChange?.((state) => {
      setConnectionState(state);
    });

    const unbindTraffic = window.api?.onTrafficStats?.((stats) => {
      setTrafficStats(stats);
    });

    const unbindWifi = window.api?.onWifiStatusChange?.((status) => {
      setWifiStatus(status);
    });

    const unbindLog = window.api?.onLog?.((log) => {
      setLogs((prev) => [log, ...prev].slice(0, 500));
    });

    return () => {
      unbindState?.();
      unbindTraffic?.();
      unbindWifi?.();
      unbindLog?.();
    };
  }, []);

  // Action Handlers
  const handleStartVpn = async (profileId?: string): Promise<boolean> => {
    if (!window.api) return false;
    try {
      const ok = await window.api.startVpn(profileId);
      if (!ok) {
        const s = await window.api.getConnectionState();
        setConnectionState(s);
      }
      return ok;
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
      return false;
    }
  };

  const handleStopVpn = async (reason = 'Stopped by user'): Promise<boolean> => {
    if (!window.api) return false;
    try {
      const ok = await window.api.stopVpn(reason);
      return ok;
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
      return false;
    }
  };

  const handleSelectProfile = async (id: string): Promise<boolean> => {
    if (!window.api) return false;
    const ok = await window.api.selectProfile(id);
    if (ok) {
      const updated = await window.api.getProfiles();
      setProfiles(updated);
    }
    return ok;
  };

  const handleSaveProfile = async (profile: Partial<ServerProfile>) => {
    if (!window.api) return;
    try {
      await window.api.saveProfile(profile);
      const updated = await window.api.getProfiles();
      setProfiles(updated);
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
      throw err;
    }
  };

  const handleDeleteProfile = async (id: string): Promise<boolean> => {
    if (!window.api) return false;
    const ok = await window.api.deleteProfile(id);
    if (ok) {
      const updated = await window.api.getProfiles();
      setProfiles(updated);
    }
    return ok;
  };

  const handleDeleteAllProfiles = async (): Promise<boolean> => {
    if (!window.api) return false;
    try {
      const ok = await window.api.deleteAllProfiles();
      if (ok) {
        setProfiles([]);
        showToast('All configurations removed', 'info');
      }
      return ok;
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
      return false;
    }
  };

  const handleDuplicateProfile = async (id: string): Promise<ServerProfile> => {
    if (!window.api) throw new Error('API unavailable');
    const dup = await window.api.duplicateProfile(id);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    return dup;
  };

  const handleTestPing = async (id: string): Promise<number> => {
    if (!window.api) return -1;
    const latency = await window.api.testLatency(id);
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    return latency;
  };

  const handleTestAllPings = async (): Promise<Record<string, number>> => {
    if (!window.api) return {};
    const res = await window.api.testAllLatencies();
    const updated = await window.api.getProfiles();
    setProfiles(updated);
    return res;
  };

  const handleImportClipboard = async () => {
    if (!window.api) return;
    try {
      let text = '';
      if (window.api.readClipboardText) {
        text = await window.api.readClipboardText();
      } else if (navigator.clipboard) {
        text = await navigator.clipboard.readText();
      }
      if (!text || !text.trim()) {
        showToast('Clipboard is empty', 'error');
        return;
      }
      const res = await window.api.importProfilesFromText(text);
      if (res.added > 0) {
        const updated = await window.api.getProfiles();
        setProfiles(updated);
        // Auto-select the new profile if it is the only one or none selected
        if (updated.length === 1 || !updated.some((p) => p.isSelected)) {
          const toSelect = updated[updated.length - 1];
          if (toSelect) {
            await window.api.selectProfile(toSelect.id);
            const reloaded = await window.api.getProfiles();
            setProfiles(reloaded);
          }
        }
        if (res.skipped && res.skipped > 0) {
          showToast(`${res.added} profile${res.added > 1 ? 's' : ''} imported, ${res.skipped} already exists`, 'success');
        } else {
          showToast(`${res.added} profile${res.added > 1 ? 's' : ''} imported`, 'success');
        }
      } else if (res.skipped && res.skipped > 0) {
        showToast(`${res.skipped} profile${res.skipped > 1 ? 's' : ''} already exists`, 'info');
      } else if (res.errors?.length) {
        showToast(res.errors[0], 'error');
      } else {
        showToast('No valid vless://, vmess:// or trojan:// link found in clipboard', 'error');
      }
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleImportFile = async (content: string) => {
    if (!window.api) return;
    try {
      const res = await window.api.importProfilesFromText(content);
      if (res.added > 0) {
        const updated = await window.api.getProfiles();
        setProfiles(updated);
        if (updated.length === 1 || !updated.some((p) => p.isSelected)) {
          const toSelect = updated[updated.length - 1];
          if (toSelect) {
            await window.api.selectProfile(toSelect.id);
            const reloaded = await window.api.getProfiles();
            setProfiles(reloaded);
          }
        }
        if (res.skipped && res.skipped > 0) {
          showToast(`${res.added} profile${res.added > 1 ? 's' : ''} imported, ${res.skipped} already exists`, 'success');
        } else {
          showToast(`${res.added} profile${res.added > 1 ? 's' : ''} imported`, 'success');
        }
      } else if (res.skipped && res.skipped > 0) {
        showToast(`${res.skipped} profile${res.skipped > 1 ? 's' : ''} already exists`, 'info');
      } else if (res.errors?.length) {
        showToast(res.errors[0], 'error');
      } else {
        showToast('No valid vless://, vmess:// or trojan:// link found in file', 'error');
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

  const handleRestartAsAdmin = async () => {
    if (window.api?.restartAsAdmin) {
      await window.api.restartAsAdmin();
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex font-sans overflow-hidden">
      {/* NetMod Style Left Sidebar (Narrow, icons only, tooltip on hover) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectionState={connectionState}
        hotspotEnabled={hotspotSettings.isHotspotSharingEnabled}
        adBlockEnabled={blockSettings.isBlockingEnabled}
        isElevated={isElevated}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Administrator Elevation Warning Banner */}
        {!isElevated && (
          <div className="bg-amber-950/90 border-b border-amber-600/60 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Administrator privileges required:</strong> Wintun TUN virtual network adapter needs elevated privileges.
              </span>
            </div>
            <button
              onClick={handleRestartAsAdmin}
              className="px-3.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 ml-4 shadow-sm transition-colors"
            >
              Restart as Administrator
            </button>
          </div>
        )}

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
          {(activeTab === 'home' || (activeTab as string) === 'dashboard') && (
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
              onDeleteAllProfiles={handleDeleteAllProfiles}
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

          {activeTab === 'exclude' && <ExcludeScreen />}

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
      </div>

      {/* Floating Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-24 z-50 animate-bounce">
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
