import React, { useState } from 'react';
import { DesktopSettings } from '../core/types';
import {
  Globe,
  Network,
  Monitor,
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck
} from 'lucide-react';

interface SettingsScreenProps {
  settings: DesktopSettings;
  onSaveSettings: (settings: DesktopSettings) => Promise<boolean>;
  onExportProfiles: () => Promise<string>;
  onImportProfiles: (json: string) => Promise<{ added: number; errors: string[] }>;
  onResetApp: () => Promise<boolean>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  onExportProfiles,
  onImportProfiles,
  onResetApp
}) => {
  const [primaryDns, setPrimaryDns] = useState(settings.primaryDns || '1.1.1.1');
  const [secondaryDns, setSecondaryDns] = useState(settings.secondaryDns || '8.8.8.8');
  const [isBypassLan, setIsBypassLan] = useState(settings.isBypassLan !== false);
  const [logLevel, setLogLevel] = useState(settings.logLevel || 'warning');
  const [minimizeToTray, setMinimizeToTray] = useState(settings.minimizeToTray !== false);
  const [closeToTray, setCloseToTray] = useState(settings.closeToTray !== false);
  const [startWithWindows, setStartWithWindows] = useState(Boolean(settings.startWithWindows));
  const [startMinimized, setStartMinimized] = useState(Boolean(settings.startMinimized));
  const [autoConnectOnLaunch, setAutoConnectOnLaunch] = useState(Boolean(settings.autoConnectOnLaunch));

  const [savedNotice, setSavedNotice] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      ...settings,
      mode: 'tun',
      primaryDns: primaryDns.trim() || '1.1.1.1',
      secondaryDns: secondaryDns.trim() || '8.8.8.8',
      isBypassLan,
      logLevel,
      minimizeToTray,
      closeToTray,
      startWithWindows,
      startMinimized,
      autoConnectOnLaunch
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExport = async () => {
    const json = await onExportProfiles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `v2raydp_profiles_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (text) {
          const res = await onImportProfiles(text);
          if (res.added > 0) {
            setImportNotice(`Successfully restored ${res.added} profiles!`);
          } else if (res.errors.length > 0) {
            setImportNotice(`Error: ${res.errors.join(', ')}`);
          }
          setTimeout(() => setImportNotice(null), 3500);
        }
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleConfirmReset = async () => {
    if (window.confirm('Are you sure you want to reset v2rayDP Desktop? This will clear all profiles and configuration.')) {
      await onResetApp();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Client Settings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure full-device TUN VPN adapter, DNS servers, Windows startup, and system tray preferences
          </p>
        </div>
        {savedNotice && (
          <div className="px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs flex items-center space-x-1.5 font-bold shadow-lg shadow-emerald-500/20">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {importNotice && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-500/60 rounded-xl text-cyan-300 text-xs flex items-center space-x-2 font-bold shadow-lg">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>{importNotice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Operating Mode: Full-device TUN VPN */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>Proxy Operating Mode</span>
          </h3>

          <div className="p-4 bg-slate-950/80 border-2 border-cyan-500/60 rounded-xl relative shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Full-Device VPN (TUN)</h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase">
                Active Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Powered by <span className="text-cyan-300 font-semibold">sing-box</span> and high-speed{' '}
              <span className="text-cyan-300 font-semibold">Wintun</span> virtual network adapter. Captures 100% of all
              system traffic (browsers, terminals, background apps, gaming, and command-line utilities) without altering the
              Windows registry or proxy settings.
            </p>
          </div>
        </div>

        {/* DNS & Routing Configuration */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <Network className="w-4 h-4" />
            <span>DNS & Routing Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary DNS Server
              </label>
              <input
                type="text"
                value={primaryDns}
                onChange={(e) => setPrimaryDns(e.target.value)}
                placeholder="1.1.1.1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Resolved securely through the encrypted proxy tunnel</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Secondary DNS Server
              </label>
              <input
                type="text"
                value={secondaryDns}
                onChange={(e) => setSecondaryDns(e.target.value)}
                placeholder="8.8.8.8"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Fallback DNS resolver inside tunnel</p>
            </div>
          </div>

          <div className="h-px bg-slate-800 pt-2" />

          {/* Bypass LAN */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Bypass LAN / Private Ranges</h4>
              <p className="text-xs text-slate-400">
                Directly routes private RFC1918 subnets (192.168.x, 10.x, 172.16.x) without going through the proxy tunnel
              </p>
            </div>
            <input
              type="checkbox"
              checked={isBypassLan}
              onChange={(e) => setIsBypassLan(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* Log Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              sing-box Engine Log Level
            </label>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value as DesktopSettings['logLevel'])}
              className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="warning">Warning (Recommended)</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="error">Error only</option>
              <option value="none">None (Silent)</option>
            </select>
          </div>
        </div>

        {/* Windows Desktop & Tray Options */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <Monitor className="w-4 h-4" />
            <span>Windows & Tray Behaviors</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Start with Windows</h4>
                <p className="text-xs text-slate-400">
                  Registers an elevated Task Scheduler task to launch v2rayDP Desktop automatically on Windows logon
                </p>
              </div>
              <input
                type="checkbox"
                checked={startWithWindows}
                onChange={(e) => setStartWithWindows(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="h-px bg-slate-800" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Start Minimized to System Tray</h4>
                <p className="text-xs text-slate-400">
                  Starts application directly in background system tray without showing main window
                </p>
              </div>
              <input
                type="checkbox"
                checked={startMinimized}
                onChange={(e) => setStartMinimized(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="h-px bg-slate-800" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Auto-Connect on App Launch</h4>
                <p className="text-xs text-slate-400">
                  Automatically establishes VPN tunnel connection on application startup
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoConnectOnLaunch}
                onChange={(e) => setAutoConnectOnLaunch(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="h-px bg-slate-800" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Minimize to System Tray</h4>
                <p className="text-xs text-slate-400">
                  Hides window into the taskbar notification tray when clicking minimize
                </p>
              </div>
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => setMinimizeToTray(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="h-px bg-slate-800" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Close to System Tray</h4>
                <p className="text-xs text-slate-400">
                  Clicking the window 'X' close button minimizes to the tray instead of quitting
                </p>
              </div>
              <input
                type="checkbox"
                checked={closeToTray}
                onChange={(e) => setCloseToTray(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Backup, Restore & Reset */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <Database className="w-4 h-4" />
          <span>Backup, Restore & Reset</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white">Export Configuration</h4>
              <p className="text-[11px] text-slate-400">Export all server profiles to a JSON backup file</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Profiles JSON</span>
            </button>
          </div>

          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white">Import Configuration</h4>
              <p className="text-[11px] text-slate-400">Restore profiles from an exported JSON file</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Profiles JSON</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-slate-800 pt-1" />

        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-red-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Factory Reset Application</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Permanently clears all imported profiles, automation rules, and restores factory defaults
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirmReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
};
