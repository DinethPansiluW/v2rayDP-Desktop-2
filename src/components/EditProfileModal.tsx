import React, { useState, useEffect } from 'react';
import { ServerProfile } from '../core/types';
import { X, Save, Shield, Key, Network, Server, Settings2 } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  profile?: ServerProfile | null;
  defaultProtocol?: 'vless' | 'vmess';
  onClose: () => void;
  onSave: (profile: Partial<ServerProfile>) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  defaultProtocol = 'vless',
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<'vless' | 'vmess' | 'trojan'>('vless');
  const [address, setAddress] = useState('');
  const [port, setPort] = useState(443);
  const [uuid, setUuid] = useState('');
  const [alterId, setAlterId] = useState(0);
  const [security, setSecurity] = useState('auto');
  const [network, setNetwork] = useState<'tcp' | 'ws' | 'grpc' | 'h2'>('tcp');
  const [headerType, setHeaderType] = useState('none');
  const [host, setHost] = useState('');
  const [path, setPath] = useState('/');
  const [tls, setTls] = useState<'none' | 'tls' | 'reality'>('reality');
  const [sni, setSni] = useState('');
  const [alpn, setAlpn] = useState('h2,http/1.1');
  const [flow, setFlow] = useState('xtls-rprx-vision');
  const [publicKey, setPublicKey] = useState('');
  const [shortId, setShortId] = useState('');
  const [fingerprint, setFingerprint] = useState('chrome');
  const [spiderX, setSpiderX] = useState('/');
  const [serviceName, setServiceName] = useState('');
  const [grpcMode, setGrpcMode] = useState('gun');
  const [pinnedPeerCertSha256, setPinnedPeerCertSha256] = useState('');
  const [verifyPeerCertByName, setVerifyPeerCertByName] = useState('');
  const [allowInsecure, setAllowInsecure] = useState(true);

  const [activeTab, setActiveTab] = useState<'basic' | 'transport' | 'tls'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setProtocol(profile.protocol || 'vless');
      setAddress(profile.address || '');
      setPort(profile.port || 443);
      setUuid(profile.uuid || '');
      setAlterId(profile.alterId || 0);
      setSecurity(profile.security || 'auto');
      setNetwork(profile.network || 'tcp');
      setHeaderType(profile.headerType || 'none');
      setHost(profile.host || '');
      setPath(profile.path || '/');
      setTls(profile.tls || 'none');
      setSni(profile.sni || '');
      setAlpn(profile.alpn || '');
      setFlow(profile.flow || '');
      setPublicKey(profile.publicKey || '');
      setShortId(profile.shortId || '');
      setFingerprint(profile.fingerprint || 'chrome');
      setSpiderX(profile.spiderX || '/');
      setServiceName(profile.serviceName || '');
      setGrpcMode(profile.grpcMode || 'gun');
      setPinnedPeerCertSha256(profile.pinnedPeerCertSha256 || '');
      setVerifyPeerCertByName(profile.verifyPeerCertByName || '');
      setAllowInsecure(profile.allowInsecure !== false);
    } else {
      setName(defaultProtocol === 'vless' ? 'New VLESS Reality Node' : 'New Node');
      setProtocol(defaultProtocol);
      setAddress('');
      setPort(443);
      setUuid(crypto.randomUUID ? crypto.randomUUID() : '12345678-1234-1234-1234-123456789abc');
      setAlterId(0);
      setSecurity(defaultProtocol === 'vmess' ? 'auto' : 'none');
      setNetwork(defaultProtocol === 'vless' ? 'tcp' : 'ws');
      setHeaderType('none');
      setHost('');
      setPath(defaultProtocol === 'vless' ? '/' : '/ws');
      setTls(defaultProtocol === 'vless' ? 'reality' : 'tls');
      setSni('');
      setAlpn(defaultProtocol === 'vless' ? 'h2,http/1.1' : '');
      setFlow(defaultProtocol === 'vless' ? 'xtls-rprx-vision' : '');
      setPublicKey('');
      setShortId('');
      setFingerprint('chrome');
      setSpiderX('/');
      setServiceName('');
      setGrpcMode('gun');
      setPinnedPeerCertSha256('');
      setVerifyPeerCertByName('');
      setAllowInsecure(true);
    }
    setError(null);
  }, [profile, defaultProtocol, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Profile name is required');
      return;
    }
    if (!address.trim()) {
      setError('Server address is required');
      return;
    }
    if (!uuid.trim()) {
      setError(protocol === 'trojan' ? 'Password is required' : 'UUID is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        id: profile?.id,
        name: name.trim(),
        protocol,
        address: address.trim(),
        port: Number(port) || 443,
        uuid: uuid.trim(),
        alterId: Number(alterId) || 0,
        security,
        network,
        headerType,
        host: host.trim(),
        path: path.trim() || '/',
        tls,
        sni: sni.trim(),
        alpn: alpn.trim(),
        flow: flow.trim(),
        publicKey: publicKey.trim(),
        shortId: shortId.trim(),
        fingerprint: fingerprint.trim(),
        spiderX: spiderX.trim() || '/',
        serviceName: serviceName.trim(),
        grpcMode,
        pinnedPeerCertSha256: pinnedPeerCertSha256.trim(),
        verifyPeerCertByName: verifyPeerCertByName.trim(),
        allowInsecure
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {profile ? 'Edit Server Profile' : 'Add New Server Profile'}
              </h3>
              <p className="text-xs text-slate-400">Configure VLESS or VMess parameters for sing-box</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          {[
            { id: 'basic' as const, label: 'Basic Settings', icon: Settings2 },
            { id: 'transport' as const, label: 'Transport Network', icon: Network },
            { id: 'tls' as const, label: 'Security & TLS', icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: BASIC SETTINGS */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Profile Remarks Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SG - Ultra Fast Reality"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => {
                      const p = e.target.value as 'vless' | 'vmess' | 'trojan';
                      setProtocol(p);
                      if ((p === 'vmess' || p === 'trojan') && tls === 'reality') {
                        setTls('tls');
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Server Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 443)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Server Address / Host</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="example.com or 198.51.100.1"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">User UUID / ID</label>
                  <button
                    type="button"
                    onClick={() => setUuid(crypto.randomUUID ? crypto.randomUUID() : '12345678-1234-1234-1234-123456789abc')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Generate UUID</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {protocol === 'vmess' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">AlterId (aid)</label>
                    <input
                      type="number"
                      value={alterId}
                      onChange={(e) => setAlterId(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Security (scy)</label>
                    <select
                      value={security}
                      onChange={(e) => setSecurity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="auto">auto</option>
                      <option value="aes-128-gcm">aes-128-gcm</option>
                      <option value="chacha20-poly1305">chacha20-poly1305</option>
                      <option value="none">none</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRANSPORT NETWORK */}
          {activeTab === 'transport' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Network Transport Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['tcp', 'ws', 'grpc', 'h2'] as const).map((netType) => (
                    <button
                      key={netType}
                      type="button"
                      onClick={() => setNetwork(netType)}
                      className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all ${
                        network === netType
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {netType}
                    </button>
                  ))}
                </div>
              </div>

              {network === 'tcp' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">TCP Header Type</label>
                  <select
                    value={headerType}
                    onChange={(e) => setHeaderType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="none">none (standard TCP)</option>
                    <option value="http">http (HTTP pseudo-request)</option>
                  </select>
                </div>
              )}

              {(network === 'ws' || network === 'h2' || (network === 'tcp' && headerType === 'http')) && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">HTTP Host / Obfs</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="e.g. cdn.example.com"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">HTTP Path</label>
                    <input
                      type="text"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="/v2ray-path"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </>
              )}

              {network === 'grpc' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">gRPC Service Name</label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="grpc-service"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">gRPC Mode</label>
                    <select
                      value={grpcMode}
                      onChange={(e) => setGrpcMode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="gun">gun (Single Stream)</option>
                      <option value="multi">multi (Multiplex)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TLS & SECURITY */}
          {activeTab === 'tls' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Security Protocol</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTls('none')}
                    className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all ${
                      tls === 'none'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    None (Plain)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTls('tls')}
                    className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all ${
                      tls === 'tls'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    Standard TLS
                  </button>
                  <button
                    type="button"
                    disabled={protocol === 'vmess'}
                    onClick={() => setTls('reality')}
                    className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all ${
                      tls === 'reality'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : protocol === 'vmess'
                        ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    VLESS Reality
                  </button>
                </div>
              </div>

              {tls !== 'none' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">SNI / ServerName</label>
                      <input
                        type="text"
                        value={sni}
                        onChange={(e) => setSni(e.target.value)}
                        placeholder="e.g. www.microsoft.com"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fingerprint (fp)</label>
                      <select
                        value={fingerprint}
                        onChange={(e) => setFingerprint(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      >
                        <option value="chrome">chrome</option>
                        <option value="firefox">firefox</option>
                        <option value="safari">safari</option>
                        <option value="ios">ios</option>
                        <option value="random">random</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">ALPN (comma-separated)</label>
                    <input
                      type="text"
                      value={alpn}
                      onChange={(e) => setAlpn(e.target.value)}
                      placeholder="h2,http/1.1"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pinned Cert SHA256 (pcs)</label>
                      <input
                        type="text"
                        value={pinnedPeerCertSha256}
                        onChange={(e) => setPinnedPeerCertSha256(e.target.value)}
                        placeholder="Optional: hash1,hash2"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Verify Cert By Name (vcn)</label>
                      <input
                        type="text"
                        value={verifyPeerCertByName}
                        onChange={(e) => setVerifyPeerCertByName(e.target.value)}
                        placeholder="Optional: cert-name"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700/80">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Insecure TLS (allowInsecure)</div>
                      <div className="text-[11px] text-slate-400">Skip TLS certificate verification (useful for custom SNI/CDN fronts)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowInsecure(!allowInsecure)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        allowInsecure ? 'bg-cyan-600 justify-end' : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>

                  {protocol === 'vless' && network === 'tcp' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Flow Control</label>
                      <select
                        value={flow}
                        onChange={(e) => setFlow(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      >
                        <option value="">none</option>
                        <option value="xtls-rprx-vision">xtls-rprx-vision (Vision)</option>
                      </select>
                    </div>
                  )}

                  {tls === 'reality' && (
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        <Key className="w-3.5 h-3.5" />
                        <span>VLESS Reality Parameters</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Public Key (pbk)</label>
                        <input
                          type="text"
                          value={publicKey}
                          onChange={(e) => setPublicKey(e.target.value)}
                          placeholder="e.g. 7A8B9C0D...="
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Short ID (sid)</label>
                          <input
                            type="text"
                            value={shortId}
                            onChange={(e) => setShortId(e.target.value)}
                            placeholder="e.g. 1a2b3c4d"
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">SpiderX (spx)</label>
                          <input
                            type="text"
                            value={spiderX}
                            onChange={(e) => setSpiderX(e.target.value)}
                            placeholder="/"
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving…' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
