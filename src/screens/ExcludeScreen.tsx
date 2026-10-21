import React, { useState, useEffect } from 'react';
import { ExcludeSettings } from '../core/types';
import { Split, ShieldCheck, Plus, Trash2, CheckCircle2, AlertCircle, AppWindow, Globe, Network, RefreshCw } from 'lucide-react';

interface ExcludeScreenProps {
  onSave?: (settings: ExcludeSettings) => Promise<void>;
}

export const ExcludeScreen: React.FC<ExcludeScreenProps> = () => {
  const [settings, setSettings] = useState<ExcludeSettings>({
    enabled: true,
    bypassLan: true,
    bypassDirectDomains: ['ir', 'cn', 'local', 'localhost'],
    bypassDirectIps: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8'],
    bypassProcesses: ['discord.exe', 'steam.exe', 'qbittorrent.exe']
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input states for adding new items
  const [newApp, setNewApp] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newIp, setNewIp] = useState('');

  const commonAppPresets = [
    { name: 'Discord', exe: 'discord.exe' },
    { name: 'Steam', exe: 'steam.exe' },
    { name: 'qBittorrent', exe: 'qbittorrent.exe' },
    { name: 'Spotify', exe: 'spotify.exe' },
    { name: 'Telegram', exe: 'telegram.exe' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (window.api?.getExcludeSettings) {
        const data = await window.api.getExcludeSettings();
        if (data) setSettings(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load exclude settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updated?: ExcludeSettings) => {
    const toSave = updated || settings;
    setSaving(true);
    setError(null);
    try {
      if (window.api?.saveExcludeSettings) {
        await window.api.saveExcludeSettings(toSave);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGlobal = () => {
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    handleSave(updated);
  };

  const handleToggleBypassLan = () => {
    const updated = { ...settings, bypassLan: !settings.bypassLan };
    setSettings(updated);
    handleSave(updated);
  };

  const handleAddApp = (exeName: string) => {
    let clean = exeName.trim().toLowerCase();
    if (!clean) return;
    if (!clean.endsWith('.exe')) clean = `${clean}.exe`;
    if (settings.bypassProcesses.includes(clean)) return;

    const updated = {
      ...settings,
      bypassProcesses: [...settings.bypassProcesses, clean]
    };
    setSettings(updated);
    setNewApp('');
    handleSave(updated);
  };

  const handleRemoveApp = (exeName: string) => {
    const updated = {
      ...settings,
      bypassProcesses: settings.bypassProcesses.filter((p) => p !== exeName)
    };
    setSettings(updated);
    handleSave(updated);
  };

  const handleAddDomain = () => {
    let clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean || settings.bypassDirectDomains.includes(clean)) return;

    const updated = {
      ...settings,
      bypassDirectDomains: [...settings.bypassDirectDomains, clean]
    };
    setSettings(updated);
    setNewDomain('');
    handleSave(updated);
  };

  const handleRemoveDomain = (domain: string) => {
    const updated = {
      ...settings,
      bypassDirectDomains: settings.bypassDirectDomains.filter((d) => d !== domain)
    };
    setSettings(updated);
    handleSave(updated);
  };

  const handleAddIp = () => {
    const clean = newIp.trim();
    if (!clean || settings.bypassDirectIps.includes(clean)) return;

    const updated = {
      ...settings,
      bypassDirectIps: [...settings.bypassDirectIps, clean]
    };
    setSettings(updated);
    setNewIp('');
    handleSave(updated);
  };

  const handleRemoveIp = (ip: string) => {
    const updated = {
      ...settings,
      bypassDirectIps: settings.bypassDirectIps.filter((i) => i !== ip)
    };
    setSettings(updated);
    handleSave(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mr-2" />
        <span>Loading exclusion settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Split className="w-5 h-5 text-cyan-400" />
            <span>Exclude & Split Tunneling</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Route chosen apps, local subnets, and domains directly to the internet without going through the VPN.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings applied</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Switch Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Enable Split Tunneling (Exclude)</div>
          <div className="text-xs text-slate-400">When enabled, the rules below bypass the TUN virtual adapter.</div>
        </div>
        <button
          type="button"
          onClick={handleToggleGlobal}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            settings.enabled ? 'bg-cyan-600 justify-end' : 'bg-slate-700 justify-start'
          }`}
        >
          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
        </button>
      </div>

      {/* Bypass LAN */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Bypass Local Network (LAN)</div>
          <div className="text-xs text-slate-400">Keep printers, routers, and local NAS accessible directly (192.168.x.x, 10.x.x.x).</div>
        </div>
        <button
          type="button"
          onClick={handleToggleBypassLan}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            settings.bypassLan ? 'bg-cyan-600 justify-end' : 'bg-slate-700 justify-start'
          }`}
        >
          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
        </button>
      </div>

      {/* Exclude Apps / Processes */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <AppWindow className="w-4 h-4" />
            <span>Bypass Applications (.exe)</span>
          </div>
          <span className="text-xs text-slate-400">{settings.bypassProcesses.length} apps excluded</span>
        </div>

        {/* Input & Quick Add */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. discord.exe or steam.exe"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddApp(newApp)}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={() => handleAddApp(newApp)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
            {commonAppPresets.map((preset) => (
              <button
                key={preset.exe}
                onClick={() => handleAddApp(preset.exe)}
                disabled={settings.bypassProcesses.includes(preset.exe)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-colors ${
                  settings.bypassProcesses.includes(preset.exe)
                    ? 'bg-slate-800/50 text-slate-500 border-slate-800'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 hover:border-cyan-500'
                }`}
              >
                +{preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Pill List */}
        <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
          {settings.bypassProcesses.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No apps excluded. All applications route through VPN.</div>
          ) : (
            settings.bypassProcesses.map((proc) => (
              <div
                key={proc}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/70 text-xs text-slate-200 font-mono"
              >
                <span>{proc}</span>
                <button
                  onClick={() => handleRemoveApp(proc)}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-1"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Exclude Direct Domains */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <Globe className="w-4 h-4" />
            <span>Bypass Specific Domains</span>
          </div>
          <span className="text-xs text-slate-400">{settings.bypassDirectDomains.length} domains</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. speedtest.net or bank.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={handleAddDomain}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
          {settings.bypassDirectDomains.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No custom domains bypassed.</div>
          ) : (
            settings.bypassDirectDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/70 text-xs text-slate-200 font-mono"
              >
                <span>{domain}</span>
                <button
                  onClick={() => handleRemoveDomain(domain)}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-1"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Exclude Direct IPs / Subnets */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <Network className="w-4 h-4" />
            <span>Bypass Direct IP CIDRs</span>
          </div>
          <span className="text-xs text-slate-400">{settings.bypassDirectIps.length} subnets</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 192.168.1.0/24 or 1.1.1.1/32"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddIp()}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={handleAddIp}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
          {settings.bypassDirectIps.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No custom subnets bypassed.</div>
          ) : (
            settings.bypassDirectIps.map((ip) => (
              <div
                key={ip}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/70 text-xs text-slate-200 font-mono"
              >
                <span>{ip}</span>
                <button
                  onClick={() => handleRemoveIp(ip)}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-1"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
