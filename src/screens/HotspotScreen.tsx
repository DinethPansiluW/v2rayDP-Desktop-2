import React, { useState } from 'react';
import { HotspotSettings, HotspotInfo } from '../core/types';
import {
  Radio,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Laptop,
  Flame,
  HelpCircle,
  KeyRound,
  Trash2,
  Lock,
  Save
} from 'lucide-react';

interface HotspotScreenProps {
  hotspotInfo: HotspotInfo;
  hotspotSettings: HotspotSettings;
  onSaveHotspotSettings: (settings: HotspotSettings) => Promise<boolean>;
  onOpenMobileHotspot: () => Promise<boolean>;
  onAddFirewallRule: (port: number) => Promise<{ success: boolean; message: string }>;
  onRemoveFirewallRule?: (port: number) => Promise<{ success: boolean; message: string }>;
}

export const HotspotScreen: React.FC<HotspotScreenProps> = ({
  hotspotInfo,
  hotspotSettings,
  onSaveHotspotSettings,
  onOpenMobileHotspot,
  onAddFirewallRule,
  onRemoveFirewallRule
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [firewallStatus, setFirewallStatus] = useState<string | null>(null);
  const [isFirewallBusy, setIsFirewallBusy] = useState(false);

  // Form state
  const [port, setPort] = useState(hotspotSettings.hotspotProxyPort || 10808);
  const [requireAuth, setRequireAuth] = useState(Boolean(hotspotSettings.requireAuth));
  const [username, setUsername] = useState(hotspotSettings.username || '');
  const [password, setPassword] = useState(hotspotSettings.password || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    await onSaveHotspotSettings({
      ...hotspotSettings,
      isHotspotSharingEnabled: enabled,
      hotspotProxyPort: port,
      requireAuth,
      username: username.trim() || undefined,
      password: password || undefined
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveHotspotSettings({
      ...hotspotSettings,
      hotspotProxyPort: port,
      requireAuth,
      username: username.trim() || undefined,
      password: password || undefined
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopy = (text: string, key: string) => {
    if (window.api?.copyToClipboard) {
      window.api.copyToClipboard(text);
    } else {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddFirewall = async () => {
    setIsFirewallBusy(true);
    setFirewallStatus(null);
    try {
      const res = await onAddFirewallRule(port);
      setFirewallStatus(res.message);
    } catch (err: unknown) {
      setFirewallStatus(`Error: ${(err as Error).message}`);
    } finally {
      setIsFirewallBusy(false);
    }
  };

  const handleRemoveFirewall = async () => {
    if (!onRemoveFirewallRule) return;
    setIsFirewallBusy(true);
    setFirewallStatus(null);
    try {
      const res = await onRemoveFirewallRule(port);
      setFirewallStatus(res.message);
    } catch (err: unknown) {
      setFirewallStatus(`Error: ${(err as Error).message}`);
    } finally {
      setIsFirewallBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Radio className="w-5 h-5 text-cyan-400" />
          <span>Hotspot & LAN Proxy Sharing</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Share your encrypted VPN connection with mobile phones, consoles, and other devices connected to your Wi-Fi or Windows Mobile Hotspot.
        </p>
      </div>

      {/* Information Banner */}
      <div className="p-4 bg-cyan-950/40 border border-cyan-800/80 rounded-2xl flex items-start space-x-3 text-cyan-200">
        <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">How Hotspot Sharing Works</p>
          <p className="text-slate-300 leading-relaxed">
            Your host PC remains 100% full-device tunnelled by the Wintun adapter. When Hotspot Sharing is enabled,
            sing-box additionally opens a mixed (SOCKS5 + HTTP) inbound listening on{' '}
            <span className="font-mono text-cyan-300 font-bold">0.0.0.0:{port}</span>. Connected phones and laptops
            simply configure this IP and port as their manual proxy.
          </p>
        </div>
      </div>

      {/* Master Share Switch */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white">Enable LAN Hotspot Sharing</h3>
            {hotspotSettings.isHotspotSharingEnabled && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase">
                Active on 0.0.0.0:{port}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Opens local port {port} for other devices on your Wi-Fi or Windows Mobile Hotspot
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hotspotSettings.isHotspotSharingEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
        </label>
      </div>

      {/* Port & Authentication Form */}
      <form onSubmit={handleSaveSettings} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Sharing Port & Authentication</span>
          </h3>
          {isSaved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mixed SOCKS/HTTP Proxy Port
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 10808)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default: 10808</p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Require Username / Password</h4>
                <p className="text-[11px] text-slate-400">Protects proxy against unauthorized LAN devices</p>
              </div>
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => setRequireAuth(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            {requireAuth && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="hotspotUser"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply Port / Auth Changes</span>
          </button>
        </div>
      </form>

      {/* Local IP Endpoints */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <Laptop className="w-4 h-4" />
          <span>Local Device Proxy Endpoints</span>
        </h3>

        <div className="space-y-3">
          {hotspotInfo.ipAddresses.map((ip) => {
            const endpoint = `${ip}:${port}`;
            return (
              <div
                key={ip}
                className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                    <span>{ip}</span>
                    <span className="text-[10px] text-slate-500 font-sans font-normal">
                      (IPv4 Network Interface)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-400">
                    <span>Proxy Address: <strong className="text-cyan-300">{endpoint}</strong></span>
                    <span className="text-[10px] text-slate-500 font-sans">(Works for both HTTP and SOCKS5)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(endpoint, `ep-${ip}`)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 rounded-xl text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors"
                  >
                    {copiedKey === `ep-${ip}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{copiedKey === `ep-${ip}` ? 'Copied!' : 'Copy IP:Port'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Windows Tools & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Open Windows Mobile Hotspot settings */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Windows Mobile Hotspot</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Turn your PC into a Wi-Fi hotspot so your phone or tablet can connect directly to your laptop.
            </p>
          </div>

          <button
            onClick={onOpenMobileHotspot}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Windows Hotspot Settings</span>
          </button>
        </div>

        {/* Windows Defender Firewall Inbound Rule */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Windows Defender Firewall</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Allow inbound TCP traffic on port {port} so devices on the hotspot can reach the proxy.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddFirewall}
                disabled={isFirewallBusy}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-300 border border-orange-500/40 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>{isFirewallBusy ? 'Applying…' : 'Add Firewall Rule'}</span>
              </button>

              <button
                onClick={handleRemoveFirewall}
                disabled={isFirewallBusy}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                title="Remove the firewall inbound rule"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Remove Rule</span>
              </button>
            </div>
            {firewallStatus && (
              <p className="text-[11px] text-cyan-300 font-mono">{firewallStatus}</p>
            )}
          </div>
        </div>
      </div>

      {/* Client Configuration Guide */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <HelpCircle className="w-4 h-4" />
          <span>How to Connect Other Devices</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <h5 className="font-bold text-white">Android / iOS Phone</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Connect to PC's Mobile Hotspot.<br />
              2. In Wi-Fi settings, set Proxy to <strong>Manual</strong>.<br />
              3. Host: PC's IP, Port: <strong className="text-cyan-400">{port}</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <h5 className="font-bold text-white">Second Laptop / PC</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Connect to the same Wi-Fi/Hotspot.<br />
              2. Open Settings -&gt; Network -&gt; Proxy.<br />
              3. Enable proxy server: IP and Port <strong className="text-cyan-400">{port}</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <h5 className="font-bold text-white">Terminal / CLI</h5>
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              export http_proxy=http://{hotspotInfo.ipAddresses[0] || '192.168.137.1'}:{port}<br />
              export https_proxy=http://{hotspotInfo.ipAddresses[0] || '192.168.137.1'}:{port}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
