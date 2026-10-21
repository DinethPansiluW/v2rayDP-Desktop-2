import React, { useState } from 'react';
import { AutomationSettings, WifiStatus, ServerProfile, SsidRule, DesktopSettings } from '../core/types';
import {
  Wifi,
  WifiOff,
  Shield,
  Zap,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Power,
  Monitor,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Radio,
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react';

interface AutomationScreenProps {
  settings: AutomationSettings;
  desktopSettings: DesktopSettings;
  wifiStatus: WifiStatus;
  profiles: ServerProfile[];
  onSaveSettings: (settings: AutomationSettings) => Promise<boolean>;
  onSaveDesktopSettings: (settings: DesktopSettings) => Promise<boolean>;
  onResetManualOverride: () => Promise<void>;
}

export const AutomationScreen: React.FC<AutomationScreenProps> = ({
  settings,
  desktopSettings,
  wifiStatus,
  profiles,
  onSaveSettings,
  onSaveDesktopSettings,
  onResetManualOverride
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSsid, setNewSsid] = useState('');
  const [newAction, setNewAction] = useState<'connect' | 'do_not_connect'>('connect');
  const [newProfileId, setNewProfileId] = useState<string>(profiles[0]?.id || '');
  const [addError, setAddError] = useState('');

  const handleToggleMaster = async (enabled: boolean) => {
    await onSaveSettings({
      ...settings,
      isAutomationGloballyEnabled: enabled
    });
  };

  const handleUpdate = async (patch: Partial<AutomationSettings>) => {
    await onSaveSettings({
      ...settings,
      ...patch
    });
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSsid.trim();
    if (!clean) {
      setAddError('Please enter a Wi-Fi SSID');
      return;
    }

    // Check duplicate case-insensitively
    const exists = settings.rules.some((r) => r.ssid.toLowerCase() === clean.toLowerCase());
    if (exists) {
      setAddError(`A rule for "${clean}" already exists`);
      return;
    }

    const newRule: SsidRule = {
      id: `rule-${Date.now()}`,
      ssid: clean,
      action: newAction,
      profileId: newAction === 'connect' ? (newProfileId || profiles[0]?.id || null) : null,
      enabled: true
    };

    const updated = [...settings.rules, newRule];
    await handleUpdate({ rules: updated });
    setNewSsid('');
    setNewAction('connect');
    setShowAddModal(false);
    setAddError('');
  };

  const handleAddCurrentNetwork = () => {
    if (!wifiStatus.ssid) return;
    setNewSsid(wifiStatus.ssid);
    setNewAction('connect');
    setNewProfileId(profiles[0]?.id || '');
    setAddError('');
    setShowAddModal(true);
  };

  const handleDeleteRule = async (id: string) => {
    const updated = settings.rules.filter((r) => r.id !== id);
    await handleUpdate({ rules: updated });
  };

  const handleToggleRuleEnabled = async (id: string, enabled: boolean) => {
    const updated = settings.rules.map((r) => (r.id === id ? { ...r, enabled } : r));
    await handleUpdate({ rules: updated });
  };

  const handleUpdateRuleAction = async (id: string, action: 'connect' | 'do_not_connect') => {
    const updated = settings.rules.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          action,
          profileId: action === 'connect' ? (r.profileId || profiles[0]?.id || null) : null
        };
      }
      return r;
    });
    await handleUpdate({ rules: updated });
  };

  const handleUpdateRuleProfile = async (id: string, profileId: string) => {
    const updated = settings.rules.map((r) => (r.id === id ? { ...r, profileId } : r));
    await handleUpdate({ rules: updated });
  };

  const handleMoveRule = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.rules.length) return;

    const list = [...settings.rules];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    await handleUpdate({ rules: list });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Wifi className="w-5 h-5 text-cyan-400" />
          <span>Wi-Fi Network Automation</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Intelligently automate VPN proxy connections based on which Wi-Fi network your Windows desktop or laptop joins.
        </p>
      </div>

      {/* Master Toggle Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white">Master Automation Engine</h3>
            {settings.isAutomationGloballyEnabled && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitors Windows Wi-Fi adapter state every 3–5 seconds with 5-second debounce
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.isAutomationGloballyEnabled}
            onChange={(e) => handleToggleMaster(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
        </label>
      </div>

      {/* Live Detected Wi-Fi Interface & Status */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Currently Connected Wi-Fi Network</span>
          </span>
          <span className="text-xs text-slate-500 font-mono">netsh wlan show interfaces</span>
        </div>

        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                wifiStatus.connected
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {wifiStatus.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white">
                  {wifiStatus.connected ? wifiStatus.ssid || 'Connected (SSID Hidden)' : 'No Wi-Fi Connection'}
                </span>
                {wifiStatus.signalPercent !== undefined && wifiStatus.connected && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                    Signal: {wifiStatus.signalPercent}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {wifiStatus.interfaceName || 'Wi-Fi Adapter'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {wifiStatus.connected && wifiStatus.ssid && (
              <button
                onClick={handleAddCurrentNetwork}
                className="px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Current Network</span>
              </button>
            )}
          </div>
        </div>

        {/* Windows Location Services Hint */}
        {wifiStatus.locationPermissionHint && (
          <div className="flex items-start space-x-2.5 p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">SSID could not be read: </span>
              <span>
                Windows may require Location Services permission for apps to view the wireless SSID. Until enabled,
                this network is treated as an unknown Wi-Fi and matches the "Any other Wi-Fi" rule.
              </span>
            </div>
          </div>
        )}

        {/* Manual Override Status Banner */}
        {settings.manualOverrideSuppressed && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Manual Disconnect Override Active: </span>
                <span>
                  Auto-reconnect is paused on current network ({settings.manualOverrideNetworkKey}) until you change networks.
                </span>
              </div>
            </div>
            <button
              onClick={onResetManualOverride}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 ml-2 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Override</span>
            </button>
          </div>
        )}
      </div>

      {/* SSID -> Profile Rules Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>SSID → Profile Rules ({settings.rules.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rules are evaluated from top to bottom (first match wins). Case-insensitive exact match.
            </p>
          </div>

          <button
            onClick={() => {
              setNewSsid('');
              setNewAction('connect');
              setNewProfileId(profiles[0]?.id || '');
              setAddError('');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-950/40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>

        {/* Rules Table / Cards */}
        <div className="space-y-3">
          {settings.rules.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-500">
              No specific SSID rules added yet. Use "Add Rule" or "Add Current Network" above.
            </div>
          ) : (
            settings.rules.map((rule, idx) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all ${
                  rule.enabled
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/30 border-slate-800/50 opacity-75'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Reorder & SSID & Status */}
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col space-y-0.5">
                      <button
                        onClick={() => handleMoveRule(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveRule(idx, 'down')}
                        disabled={idx === settings.rules.length - 1}
                        title="Move Down"
                        className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-white px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded-lg">
                          {rule.ssid}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {rule.enabled
                          ? 'Rule is active'
                          : 'Rule disabled (ignored completely; falls back to Any other Wi-Fi)'}
                      </p>
                    </div>
                  </div>

                  {/* Middle & Right: Action / Profile Dropdown & Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Action Selector */}
                    <select
                      value={rule.action}
                      onChange={(e) => handleUpdateRuleAction(rule.id, e.target.value as 'connect' | 'do_not_connect')}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="connect">Connect VPN</option>
                      <option value="do_not_connect">Do Not Connect</option>
                    </select>

                    {/* Target Profile Dropdown (if connect) */}
                    {rule.action === 'connect' && (
                      <select
                        value={rule.profileId || ''}
                        onChange={(e) => handleUpdateRuleProfile(rule.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 max-w-[200px]"
                      >
                        {profiles.length === 0 && <option value="">No Profiles Available</option>}
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.protocol.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Enable / Disable Switch */}
                    <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => handleToggleRuleEnabled(rule.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>

                      {/* Delete Rule */}
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Built-in Last Rule: "Any other Wi-Fi" */}
          <div
            className={`p-5 rounded-2xl border transition-all mt-4 ${
              settings.fallbackRule.enabled
                ? 'bg-gradient-to-r from-slate-950 via-[#101b2f] to-slate-950 border-cyan-800/40 shadow-md'
                : 'bg-slate-950/40 border-slate-800/60 opacity-80'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-cyan-300 flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Any other Wi-Fi (Fallback Rule)</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                    Default / Last Rule
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Applies ONLY to networks that have no specific SSID rule. An SSID with its own rule (or "Do not connect")
                  is excluded. If this switch is OFF, VPN will NEVER auto-connect on unlisted networks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {settings.fallbackRule.enabled ? (
                  <>
                    <select
                      value={settings.fallbackRule.action}
                      onChange={(e) =>
                        handleUpdate({
                          fallbackRule: {
                            ...settings.fallbackRule,
                            action: e.target.value as 'connect' | 'do_not_connect'
                          }
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="connect">Connect VPN</option>
                      <option value="do_not_connect">Do Not Connect</option>
                    </select>

                    {settings.fallbackRule.action === 'connect' && (
                      <select
                        value={settings.fallbackRule.profileId || ''}
                        onChange={(e) =>
                          handleUpdate({
                            fallbackRule: {
                              ...settings.fallbackRule,
                              profileId: e.target.value || null
                            }
                          })
                        }
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 max-w-[200px]"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.protocol.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 italic">Fallback is Disabled</span>
                )}

                <label className="relative inline-flex items-center cursor-pointer pl-2 border-l border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.fallbackRule.enabled}
                    onChange={(e) =>
                      handleUpdate({
                        fallbackRule: {
                          ...settings.fallbackRule,
                          enabled: e.target.checked
                        }
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnection & Leaving Wi-Fi Policies */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Leaving Wi-Fi & Disconnect Policies</span>
        </h3>

        <div className="space-y-4">
          {/* Policy Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              When Leaving Target Wi-Fi:
            </label>
            <select
              value={settings.wifiLeavePolicy}
              onChange={(e) => handleUpdate({ wifiLeavePolicy: e.target.value as 'STOP_VPN' | 'KEEP_VPN' })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="STOP_VPN">Stop VPN (Disconnects TUN adapter)</option>
              <option value="KEEP_VPN">Keep VPN Running (Do not interrupt VPN tunnel)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {settings.wifiLeavePolicy === 'STOP_VPN'
                ? 'Terminates sing-box VPN tunnel immediately upon disconnecting from the Wi-Fi.'
                : 'Keeps VPN tunnel active across physical network transitions.'}
            </p>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Auto stop when Wi-Fi off */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Auto-Stop when Wi-Fi is Disabled</h4>
              <p className="text-xs text-slate-400">
                Immediately stops proxy if the user turns off the Wi-Fi radio or disconnects adapter
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoStopOnWifiOff}
              onChange={(e) => handleUpdate({ autoStopOnWifiOff: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* Auto reconnect on return */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Auto-Reconnect on Wi-Fi Return</h4>
              <p className="text-xs text-slate-400">
                Automatically resumes proxy connection when returning to an approved Wi-Fi network
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoReconnectOnWifiReturn}
              onChange={(e) => handleUpdate({ autoReconnectOnWifiReturn: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Windows Desktop Startup Switches */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <Monitor className="w-4 h-4" />
          <span>Windows Startup Options</span>
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Start with Windows</h4>
              <p className="text-xs text-slate-400">
                Launches v2rayDP Desktop automatically on Windows login (app.setLoginItemSettings)
              </p>
            </div>
            <input
              type="checkbox"
              checked={desktopSettings.startWithWindows}
              onChange={(e) => onSaveDesktopSettings({ ...desktopSettings, startWithWindows: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="h-px bg-slate-800" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Start Minimized to System Tray</h4>
              <p className="text-xs text-slate-400">
                Runs quietly in the Windows taskbar tray without showing the main window on startup
              </p>
            </div>
            <input
              type="checkbox"
              checked={desktopSettings.startMinimized}
              onChange={(e) => onSaveDesktopSettings({ ...desktopSettings, startMinimized: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="h-px bg-slate-800" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Auto-Connect on App Launch</h4>
              <p className="text-xs text-slate-400">
                Instantly establishes proxy tunnel when the application starts
              </p>
            </div>
            <input
              type="checkbox"
              checked={desktopSettings.autoConnectOnLaunch}
              onChange={(e) => onSaveDesktopSettings({ ...desktopSettings, autoConnectOnLaunch: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span>Add SSID Automation Rule</span>
            </h3>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Wi-Fi Network SSID Name
                </label>
                <input
                  type="text"
                  value={newSsid}
                  onChange={(e) => {
                    setNewSsid(e.target.value);
                    setAddError('');
                  }}
                  placeholder="e.g. Home_5G, Office_Secure, Starbucks"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Action When Joining This Network
                </label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as 'connect' | 'do_not_connect')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="connect">Connect VPN</option>
                  <option value="do_not_connect">Do Not Connect (Excludes network from VPN)</option>
                </select>
              </div>

              {newAction === 'connect' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assigned Server Profile
                  </label>
                  <select
                    value={newProfileId}
                    onChange={(e) => setNewProfileId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.protocol.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addError && (
                <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
                  {addError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-cyan-950/40 cursor-pointer"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
