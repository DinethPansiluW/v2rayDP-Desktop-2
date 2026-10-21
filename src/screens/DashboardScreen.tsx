import React, { useState, useEffect, useRef } from 'react';
import { ServerProfile, ConnectionState, TrafficStats, AppLog } from '../core/types';
import {
  Play,
  Square,
  ArrowUp,
  ArrowDown,
  Activity,
  ClipboardPaste,
  FileText,
  Trash2,
  Edit2,
  Copy,
  QrCode,
  FileCode,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  HardDrive,
  Layers,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VmessLinkParser } from '../core/VmessLinkParser';
import { QrCodeModal } from '../components/QrCodeModal';
import { SingBoxConfigModal } from '../components/SingBoxConfigModal';
import { EditProfileModal } from '../components/EditProfileModal';

interface DashboardScreenProps {
  connectionState: ConnectionState;
  trafficStats: TrafficStats;
  profiles: ServerProfile[];
  logs: AppLog[];
  onStartVpn: (profileId?: string) => Promise<boolean>;
  onStopVpn: () => Promise<boolean>;
  onSelectProfile: (profileId: string) => Promise<boolean>;
  onSaveProfile: (profile: Partial<ServerProfile>) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<boolean>;
  onDuplicateProfile: (profileId: string) => Promise<ServerProfile>;
  onTestPing: (profileId: string) => Promise<number>;
  onTestAllPings: () => Promise<Record<string, number>>;
  onImportClipboard: () => Promise<void>;
  onImportFile: (content: string) => Promise<void>;
  onClearLogs: () => Promise<boolean>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  connectionState,
  trafficStats,
  profiles,
  logs,
  onStartVpn,
  onStopVpn,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  onDuplicateProfile,
  onTestPing,
  onTestAllPings,
  onImportClipboard,
  onImportFile,
  onClearLogs
}) => {
  const isConnected = connectionState.status === 'connected';
  const isConnecting = connectionState.status === 'connecting';
  const isError = connectionState.status === 'error';

  const selectedProfile = profiles.find((p) => p.isSelected) || profiles[0] || null;

  // Modals & Panels
  const [editingProfile, setEditingProfile] = useState<ServerProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [qrModalProfile, setQrModalProfile] = useState<ServerProfile | null>(null);
  const [jsonModalProfile, setJsonModalProfile] = useState<ServerProfile | null>(null);

  // 3-dot dropdown menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Switching confirmation modal
  const [switchConfirmTarget, setSwitchConfirmTarget] = useState<ServerProfile | null>(null);

  // Ping states
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingingProfileId, setPingingProfileId] = useState<string | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Logs drawer (collapsible at bottom)
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 1-Click Clipboard Import (no dialogs, immediate toast)
  const handleOneClickClipboardImport = async () => {
    try {
      let clipboardText = '';
      if (window.api?.readClipboardText) {
        clipboardText = await window.api.readClipboardText();
      } else if (navigator.clipboard?.readText) {
        clipboardText = await navigator.clipboard.readText();
      }

      if (!clipboardText || !clipboardText.trim()) {
        showToast('Clipboard is empty');
        return;
      }

      if (window.api?.importProfilesFromText) {
        const res = await window.api.importProfilesFromText(clipboardText);
        if (res.added > 0) {
          showToast(`${res.added} profile${res.added > 1 ? 's' : ''} imported`);
        } else if (res.errors && res.errors.length > 0) {
          showToast(`Import failed: ${res.errors[0]}`);
        } else {
          showToast('No valid vless://, vmess://, or trojan:// links found');
        }
      } else {
        await onImportClipboard();
        showToast('Clipboard imported');
      }
    } catch (err: unknown) {
      showToast(`Import error: ${(err as Error).message}`);
    }
  };

  const handleCardClick = async (profile: ServerProfile) => {
    if (profile.id === selectedProfile?.id && isConnected) {
      return;
    }

    if (isConnected && profile.id !== selectedProfile?.id) {
      // Prompt switch confirmation
      setSwitchConfirmTarget(profile);
      return;
    }

    await onSelectProfile(profile.id);
  };

  const confirmSwitchProfile = async () => {
    if (!switchConfirmTarget) return;
    const target = switchConfirmTarget;
    setSwitchConfirmTarget(null);

    await onStopVpn();
    await onSelectProfile(target.id);
    setTimeout(() => {
      onStartVpn(target.id);
    }, 600);
  };

  const handlePingSingle = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    setPingingProfileId(profileId);
    try {
      await onTestPing(profileId);
    } finally {
      setPingingProfileId(null);
    }
  };

  const handlePingAll = async () => {
    if (isPingingAll || profiles.length === 0) return;
    setIsPingingAll(true);
    try {
      await onTestAllPings();
      showToast('All node pings updated');
    } catch {
      showToast('Ping test failed');
    } finally {
      setIsPingingAll(false);
    }
  };

  const handleExportJson = async () => {
    try {
      if (window.api?.exportProfilesJson) {
        const jsonStr = await window.api.exportProfilesJson();
        if (window.api?.copyToClipboard) {
          await window.api.copyToClipboard(jsonStr);
          showToast('Profiles JSON copied to clipboard');
        }
      }
    } catch {
      showToast('Failed to export profiles');
    }
    setIsMenuOpen(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        await onImportFile(content);
        showToast('File imported');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsMenuOpen(false);
  };

  // Format Helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSpeed = (bps: number) => {
    if (!bps || bps <= 0) return '0 KB/s';
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  };

  const getProtocolTag = (profile: ServerProfile): string => {
    const p = profile.protocol.toUpperCase();
    const net = (profile.network || 'tcp').toUpperCase();
    let sec = '';
    if (profile.tls === 'reality') sec = 'Reality';
    else if (profile.tls === 'tls') sec = 'TLS';
    if (profile.flow === 'xtls-rprx-vision') sec += sec ? ' · Vision' : 'Vision';

    return [p, net, sec].filter(Boolean).join(' · ');
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.protocol.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative flex flex-col h-full max-w-5xl mx-auto space-y-4 pb-20 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-2xl shadow-cyan-500/20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Connection Switch Confirmation Modal */}
      {switchConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-white font-bold text-base">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
              <span>Switch Profile Now?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              VPN is currently connected. Switching to <span className="text-cyan-300 font-bold">"{switchConfirmTarget.name}"</span> will briefly disconnect and reconnect your VPN tunnel.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSwitchConfirmTarget(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitchProfile}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition-colors"
              >
                Switch & Reconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header: NetMod Style */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-extrabold text-white tracking-tight">Home</h1>

          {/* Connection Status Badge */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isConnected
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : isConnecting
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 animate-pulse'
                : isError
                ? 'bg-red-950/80 border-red-500/40 text-red-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : isConnecting
                  ? 'bg-amber-400'
                  : isError
                  ? 'bg-red-400'
                  : 'bg-slate-500'
              }`}
            />
            <span>
              {isConnected
                ? `Connected (${selectedProfile?.name || 'Active'})`
                : isConnecting
                ? 'Connecting...'
                : isError
                ? 'Error'
                : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Right Icon Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* One-Click Import from Clipboard */}
          <button
            onClick={handleOneClickClipboardImport}
            title="Import from clipboard (vless://, vmess://, trojan://)"
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>

          {/* Scan QR / Import File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import profile file (.json, .txt)"
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Add Manual Profile */}
          <button
            onClick={() => {
              setEditingProfile(null);
              setIsEditModalOpen(true);
            }}
            title="Add Node manually"
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* 3-Dot Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="More options"
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                <button
                  onClick={handleExportJson}
                  className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export Profiles JSON</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import File (.json)</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedProfile) setJsonModalProfile(selectedProfile);
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View sing-box Config</span>
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button
                  onClick={async () => {
                    await onClearLogs();
                    showToast('Logs cleared');
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-400 hover:text-red-400 hover:bg-slate-800/80 flex items-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear System Logs</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {isError && connectionState.errorMessage && (
        <div className="flex items-start space-x-3 p-3.5 bg-red-950/80 border border-red-500/50 rounded-2xl text-xs text-red-200 shadow-lg animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">
            {connectionState.errorMessage}
          </div>
        </div>
      )}

      {/* NetMod Speed & Traffic Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Download Speed */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-3 shadow-md flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Download</div>
            <div className="text-sm font-bold text-white font-mono">{formatSpeed(trafficStats.downloadSpeedBps)}</div>
          </div>
        </div>

        {/* Upload Speed */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-3 shadow-md flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <ArrowUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Upload</div>
            <div className="text-sm font-bold text-white font-mono">{formatSpeed(trafficStats.uploadSpeedBps)}</div>
          </div>
        </div>

        {/* Total Data */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-3 shadow-md flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Session Data</div>
            <div className="text-xs font-bold text-white font-mono">
              {formatBytes(trafficStats.sessionRxBytes + trafficStats.sessionTxBytes)}
            </div>
          </div>
        </div>

        {/* Time / Duration */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-3 shadow-md flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Duration</div>
            <div className="text-sm font-bold text-white font-mono">
              {isConnected ? formatDuration(trafficStats.connectedDurationSeconds) : '00:00'}
            </div>
          </div>
        </div>
      </div>

      {/* Profile List Header & Search */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profiles ({profiles.length})</h2>
          {isPingingAll && (
            <span className="flex items-center space-x-1 text-[11px] text-cyan-400 font-mono animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Testing pings...</span>
            </span>
          )}
        </div>

        <div className="relative w-44">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* NetMod Style Profile Cards List */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[220px]">
        {filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3 bg-[#111827]/40 rounded-2xl border border-dashed border-slate-800">
            <Layers className="w-8 h-8 text-slate-600" />
            <div className="text-xs">No VPN profiles found</div>
            <button
              onClick={handleOneClickClipboardImport}
              className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Import from Clipboard</span>
            </button>
          </div>
        ) : (
          filteredProfiles.map((prof) => {
            const isSelected = prof.id === selectedProfile?.id;
            const isCurrentActive = isConnected && isSelected;
            const ping = prof.pingLatencyMs;
            const isPingingThis = pingingProfileId === prof.id;

            return (
              <div
                key={prof.id}
                onClick={() => handleCardClick(prof)}
                className={`group relative rounded-2xl p-3.5 transition-all cursor-pointer border flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#131d33] border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#111827] border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Left Active Accent Bar (NetMod signature indicator) */}
                {isSelected && (
                  <span
                    className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${
                      isCurrentActive
                        ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                        : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    }`}
                  />
                )}

                {/* Left Node Info */}
                <div className="flex items-center space-x-3.5 pl-2 min-w-0">
                  {/* Select radio circle */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? isCurrentActive
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-600 bg-slate-900 group-hover:border-slate-500'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white truncate">{prof.name}</span>
                      {isCurrentActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-600/50">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {prof.address}:{prof.port}
                    </div>
                  </div>
                </div>

                {/* Right Tags & Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {/* Protocol tag pill */}
                  <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-cyan-300">
                    {getProtocolTag(prof)}
                  </span>

                  {/* Ping latency badge */}
                  <button
                    onClick={(e) => handlePingSingle(e, prof.id)}
                    title="Click to test ping"
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border flex items-center space-x-1 transition-all ${
                      isPingingThis
                        ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                        : ping !== undefined && ping > 0
                        ? ping < 150
                          ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                          : ping < 300
                          ? 'bg-amber-950/70 border-amber-500/40 text-amber-300 hover:border-amber-400'
                          : 'bg-red-950/70 border-red-500/40 text-red-300 hover:border-red-400'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {isPingingThis ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>{ping !== undefined && ping > 0 ? `${ping} ms` : '—'}</span>
                    )}
                  </button>

                  {/* Actions: Share, Edit, Delete */}
                  <div className="flex items-center space-x-1 pl-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrModalProfile(prof);
                      }}
                      title="Share / QR code"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfile(prof);
                        setIsEditModalOpen(true);
                      }}
                      title="Edit profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete node "${prof.name}"?`)) {
                          await onDeleteProfile(prof.id);
                          showToast('Profile deleted');
                        }
                      }}
                      title="Delete profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Controls (NetMod Bottom-Right) */}
      <div className="fixed bottom-6 right-8 z-40 flex items-center space-x-3">
        {/* Test Ping All Nodes button */}
        <button
          onClick={handlePingAll}
          disabled={isPingingAll || profiles.length === 0}
          title="Test ping for all nodes"
          className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 shadow-xl shadow-black/50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Activity className={`w-5 h-5 ${isPingingAll ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* NetMod Signature Coral/Orange START / STOP Button */}
        {isConnected ? (
          <button
            onClick={() => onStopVpn()}
            title="Stop VPN"
            className="group flex items-center space-x-3 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-2xl shadow-red-600/40 font-bold transition-all transform hover:scale-105 active:scale-95 border border-red-400/30"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Square className="w-3.5 h-3.5 fill-white text-white" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold tracking-wider text-red-200">STOP VPN</div>
              <div className="text-xs font-mono font-bold leading-tight">
                {formatDuration(trafficStats.connectedDurationSeconds)}
              </div>
            </div>
          </button>
        ) : isConnecting ? (
          <div className="flex items-center space-x-2.5 px-6 py-3.5 rounded-full bg-amber-600 text-white shadow-2xl shadow-amber-600/40 font-bold text-sm border border-amber-400/30 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : (
          <button
            onClick={() => onStartVpn()}
            disabled={profiles.length === 0}
            title="Start VPN (TUN mode)"
            className="group flex items-center space-x-2.5 px-7 py-4 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-2xl shadow-orange-500/40 font-extrabold text-sm tracking-wider uppercase transition-all transform hover:scale-105 active:scale-95 border border-orange-400/30 disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START</span>
          </button>
        )}
      </div>

      {/* Collapsible Logs Drawer Footer */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          onClick={() => setIsLogsOpen(!isLogsOpen)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">
            Engine Logs ({logs.length})
          </span>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 font-mono">
              {logs[0] ? `Latest: ${logs[0].message.substring(0, 40)}...` : 'No logs yet'}
            </span>
            {isLogsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isLogsOpen && (
          <div className="mt-2 p-3 bg-black/60 border border-slate-800 rounded-xl max-h-36 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic">No logs recorded.</div>
            ) : (
              logs.slice(0, 50).map((l) => (
                <div key={l.id} className="flex items-start space-x-2">
                  <span className="text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  <span
                    className={`font-bold ${
                      l.level === 'ERROR'
                        ? 'text-red-400'
                        : l.level === 'WARN'
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    [{l.tag}]
                  </span>
                  <span className="truncate">{l.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          profile={editingProfile}
          defaultProtocol="vless"
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (updated) => {
            await onSaveProfile(updated);
            showToast('Profile saved');
          }}
        />
      )}

      {/* QR Code Modal */}
      {qrModalProfile && (
        <QrCodeModal
          isOpen={Boolean(qrModalProfile)}
          profile={qrModalProfile}
          onClose={() => setQrModalProfile(null)}
        />
      )}

      {/* sing-box Config Inspection Modal */}
      {jsonModalProfile && (
        <SingBoxConfigModal
          isOpen={Boolean(jsonModalProfile)}
          profile={jsonModalProfile}
          onClose={() => setJsonModalProfile(null)}
        />
      )}
    </div>
  );
};
