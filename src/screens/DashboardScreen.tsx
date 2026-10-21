import React, { useState, useEffect, useRef } from 'react';
import { ServerProfile, ConnectionState, TrafficStats, AppLog } from '../core/types';
import {
  Power,
  Play,
  Square,
  ArrowUp,
  ArrowDown,
  Clock,
  HardDrive,
  Activity,
  Plus,
  ClipboardPaste,
  FileText,
  Trash2,
  Edit2,
  Copy,
  QrCode,
  FileCode,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
  Server,
  Zap,
  CheckCircle2,
  Layers
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

  const activeProfile = profiles.find((p) => p.isSelected) || profiles[0] || null;

  // Modals & Panels
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ServerProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [manualProtocol, setManualProtocol] = useState<'vless' | 'vmess'>('vless');
  const [qrModalProfile, setQrModalProfile] = useState<ServerProfile | null>(null);
  const [jsonModalProfile, setJsonModalProfile] = useState<ServerProfile | null>(null);

  // Quick switch dropdown
  const [isQuickSwitchOpen, setIsQuickSwitchOpen] = useState(false);

  // Testing all pings state
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [testingPingId, setTestingPingId] = useState<string | null>(null);

  // Search & filter
  const [profileSearch, setProfileSearch] = useState('');

  // Logs panel
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  const [logFilter, setLogFilter] = useState<'ALL' | 'AUTO' | 'ERROR'>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll logs when open
  useEffect(() => {
    if (isLogsOpen && logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [logs, isLogsOpen]);

  const handleTestAll = async () => {
    setIsPingingAll(true);
    try {
      await onTestAllPings();
    } finally {
      setIsPingingAll(false);
    }
  };

  const handleSinglePing = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingPingId(id);
    try {
      await onTestPing(id);
    } finally {
      setTestingPingId(null);
    }
  };

  const handleToggleVpn = () => {
    if (isConnected) {
      onStopVpn();
    } else {
      onStartVpn(activeProfile?.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onImportFile(text);
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!profileSearch) return true;
    const q = profileSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.protocol.toLowerCase().includes(q)
    );
  });

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'AUTO' && l.level !== 'AUTO' && l.tag !== 'Automation') return false;
    if (logFilter === 'ERROR' && l.level !== 'ERROR' && l.level !== 'WARN') return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      return l.message.toLowerCase().includes(q) || l.tag.toLowerCase().includes(q);
    }
    return true;
  });

  const getLatencyColor = (ms: number | undefined) => {
    if (ms === undefined || ms < 0) return 'text-slate-500 bg-slate-900 border-slate-800';
    if (ms <= 120) return 'text-emerald-400 bg-emerald-950/70 border-emerald-800/60';
    if (ms <= 260) return 'text-amber-400 bg-amber-950/70 border-amber-800/60';
    return 'text-red-400 bg-red-950/70 border-red-800/60';
  };

  return (
    <div className="space-y-6 pb-8">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.json" className="hidden" />

      {/* Top Banner: Big Round Connect Button & Active Profile Quick Switch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Big Power Button & Realtime State */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#111827] to-[#0c121e] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
          {/* Subtle Cyber Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

          {/* Large Circular Connect/Disconnect Button */}
          <div className="relative z-10 my-2">
            <button
              onClick={handleToggleVpn}
              disabled={isConnecting}
              aria-label={isConnected ? 'Disconnect' : 'Connect'}
              className={`relative group w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 disabled:opacity-75 ${
                isConnected
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 glow-connected shadow-emerald-500/30'
                  : isConnecting
                  ? 'bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 animate-pulse'
                  : 'bg-gradient-to-tr from-slate-800 to-slate-700 text-cyan-400 border border-slate-600/80 hover:border-cyan-400/80 hover:text-white hover:shadow-cyan-500/20 shadow-xl'
              }`}
            >
              <Power className={`w-14 h-14 transition-transform group-hover:scale-110 ${isConnected ? 'text-slate-950' : 'text-cyan-400'}`} />
              <span className={`text-[11px] font-extrabold uppercase tracking-wider mt-1.5 ${isConnected ? 'text-slate-950' : 'text-slate-300'}`}>
                {isConnected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect'}
              </span>
            </button>
          </div>

          {/* State Text & Uptime */}
          <div className="text-center z-10 mt-3">
            <div className="flex items-center justify-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 animate-ping'
                    : isConnecting
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-sm font-bold text-white tracking-wide">
                {isConnected ? 'PROTECTED & CONNECTED' : isConnecting ? 'STARTING TUN VPN…' : 'NOT CONNECTED'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                VPN (TUN)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isConnected
                ? `Virtual Adapter: ${connectionState.virtualAdapterName || 'v2raydp-tun'} (Wintun) • Full Device Tunnel`
                : 'Tap big circle to route all system traffic through TUN VPN'}
            </p>
          </div>
        </div>

        {/* Right Column: Active Profile Card & Live Traffic Stats */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Active Profile Card with Quick Switch Dropdown */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Server className="w-3.5 h-3.5" />
                <span>Active Server Node</span>
              </div>

              {/* Quick Switch Button */}
              <div className="relative">
                <button
                  onClick={() => setIsQuickSwitchOpen(!isQuickSwitchOpen)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-slate-700 rounded-xl text-xs font-medium transition-all"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Switch Node</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isQuickSwitchOpen && (
                  <div className="absolute right-0 top-9 z-50 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      Select Server Profile
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setIsQuickSwitchOpen(false);
                            onSelectProfile(p.id);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                            p.isSelected ? 'bg-cyan-500/10 text-cyan-300 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-semibold">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.protocol.toUpperCase()} • {p.address}:{p.port}
                            </div>
                          </div>
                          {p.isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activeProfile ? (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base truncate pr-2">{activeProfile.name}</h3>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getLatencyColor(activeProfile.pingLatencyMs)}`}>
                    {activeProfile.pingLatencyMs && activeProfile.pingLatencyMs > 0
                      ? `${activeProfile.pingLatencyMs} ms`
                      : 'Not tested'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50 uppercase font-bold">
                    {activeProfile.protocol.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {activeProfile.network.toUpperCase()}
                  </span>
                  {activeProfile.tls === 'reality' ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-bold">
                      REALITY
                    </span>
                  ) : activeProfile.tls === 'tls' ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                      TLS
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      PLAIN
                    </span>
                  )}
                  {activeProfile.flow && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                      {activeProfile.flow}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs font-mono text-slate-400 truncate">
                  Target: {activeProfile.address}:{activeProfile.port}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">No profile configured</div>
            )}
          </div>

          {/* Traffic Stats Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Throughput & Traffic</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>
                  {Math.floor(trafficStats.connectedDurationSeconds / 60)}m {trafficStats.connectedDurationSeconds % 60}s
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-medium">
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Download</span>
                </div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {(trafficStats.downloadSpeedBps / 1000000).toFixed(2)} <span className="text-xs text-slate-400">MB/s</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-medium">
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {(trafficStats.uploadSpeedBps / 1000).toFixed(1)} <span className="text-xs text-slate-400">KB/s</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-medium">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Downloaded</span>
                </div>
                <div className="text-base font-bold text-white font-mono mt-1">
                  {(trafficStats.sessionRxBytes / 1000000).toFixed(1)} <span className="text-xs text-slate-400">MB</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-medium">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Uploaded</span>
                </div>
                <div className="text-base font-bold text-white font-mono mt-1">
                  {(trafficStats.sessionTxBytes / 1000000).toFixed(1)} <span className="text-xs text-slate-400">MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Management Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Proxy Profiles ({profiles.length})</h3>
            <p className="text-xs text-slate-400">Select node to connect or test server latencies</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Search nodes…"
                className="bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
              />
            </div>

            {/* Test All Pings */}
            <button
              onClick={handleTestAll}
              disabled={isPingingAll || profiles.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPingingAll ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isPingingAll ? 'Testing…' : 'Test All'}</span>
            </button>

            {/* Add / Import Menu */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Import</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showAddMenu && (
                <div className="absolute right-0 top-9 z-50 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onImportClipboard();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Import from Clipboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Import from File</span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      setEditingProfile(null);
                      setManualProtocol('vless');
                      setIsEditModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Add Manually: VLESS</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      setEditingProfile(null);
                      setManualProtocol('vmess');
                      setIsEditModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Add Manually: VMess</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profiles List */}
        <div className="mt-4 space-y-2.5">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No profiles found matching search. Click "Add / Import" to add nodes.
            </div>
          ) : (
            filteredProfiles.map((p) => {
              const isSelected = p.isSelected;
              const isPinging = testingPingId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProfile(p.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/80 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white truncate">{p.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">
                          {p.protocol}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {p.network}
                        </span>
                        {p.tls === 'reality' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40 font-bold">
                            REALITY
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        {p.address}:{p.port} {p.host ? `• host: ${p.host}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 self-end md:self-auto shrink-0">
                    {/* Latency Pill */}
                    <button
                      onClick={(e) => handleSinglePing(p.id, e)}
                      title="Test Latency"
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center space-x-1 ${getLatencyColor(
                        p.pingLatencyMs
                      )} hover:border-cyan-400`}
                    >
                      <Activity className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                      <span>{p.pingLatencyMs && p.pingLatencyMs > 0 ? `${p.pingLatencyMs}ms` : 'Ping'}</span>
                    </button>

                    {/* QR Code */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrModalProfile(p);
                      }}
                      title="Show QR Code"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* View sing-box JSON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setJsonModalProfile(p);
                      }}
                      title="View Generated sing-box JSON"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <FileCode className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfile(p);
                        setIsEditModalOpen(true);
                      }}
                      title="Edit Profile"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProfile(p.id);
                      }}
                      title="Duplicate Profile"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProfile(p.id);
                      }}
                      title="Delete Profile"
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Collapsible Live Logs Panel */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Logs Header */}
        <div
          onClick={() => setIsLogsOpen(!isLogsOpen)}
          className="px-5 py-3.5 bg-slate-900/80 flex items-center justify-between cursor-pointer border-b border-slate-800 select-none"
        >
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Live Core & Automation Logs ({logs.length})
            </h4>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">Click to {isLogsOpen ? 'collapse' : 'expand'}</span>
            {isLogsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Logs Body */}
        {isLogsOpen && (
          <div className="p-4 space-y-3">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5">
                {(['ALL', 'AUTO', 'ERROR'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      logFilter === filter
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs…"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 w-36"
                />
                <button
                  onClick={onClearLogs}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-900 rounded-lg"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Scrollable logs console */}
            <div
              ref={logsEndRef}
              className="h-44 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-6">No logs recorded yet</div>
              ) : (
                filteredLogs.map((log) => {
                  const levelClass =
                    log.level === 'ERROR'
                      ? 'text-red-400 font-bold'
                      : log.level === 'WARN'
                      ? 'text-amber-400'
                      : log.level === 'AUTO'
                      ? 'text-cyan-400 font-bold'
                      : 'text-slate-400';
                  return (
                    <div key={log.id} className="leading-tight flex items-start space-x-2 hover:bg-slate-900/40 px-1 py-0.5 rounded">
                      <span className="text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`shrink-0 ${levelClass}`}>[{log.level}]</span>
                      <span className="text-slate-400 shrink-0">[{log.tag}]</span>
                      <span className="text-slate-200 break-all">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        profile={editingProfile}
        defaultProtocol={manualProtocol}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={onSaveProfile}
      />

      <QrCodeModal
        isOpen={Boolean(qrModalProfile)}
        profile={qrModalProfile}
        onClose={() => setQrModalProfile(null)}
      />

      <SingBoxConfigModal
        isOpen={Boolean(jsonModalProfile)}
        profile={jsonModalProfile}
        onClose={() => setJsonModalProfile(null)}
      />
    </div>
  );
};
