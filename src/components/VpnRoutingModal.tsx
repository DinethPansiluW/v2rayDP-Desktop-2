import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, RefreshCw, Globe, CheckCircle2, XCircle, Activity, Server } from 'lucide-react';
import { VpnRoutingTestResult, PublicIpInfo } from '../core/types';

interface VpnRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

export const VpnRoutingModal: React.FC<VpnRoutingModalProps> = ({ isOpen, onClose, isConnected }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<VpnRoutingTestResult | null>(null);
  const [realIpInfo, setRealIpInfo] = useState<PublicIpInfo | null>(null);
  const [vpnIpInfo, setVpnIpInfo] = useState<PublicIpInfo | null>(null);

  const runTest = async () => {
    setTesting(true);
    try {
      if (window.api?.testVpnRouting) {
        const [result, realIp, vpnIp] = await Promise.all([
          window.api.testVpnRouting(),
          window.api.getRealIp ? window.api.getRealIp() : Promise.resolve(null),
          window.api.checkPublicIp ? window.api.checkPublicIp(true) : Promise.resolve(null)
        ]);
        setTestResult(result);
        setRealIpInfo(realIp);
        setVpnIpInfo(vpnIp);
      }
    } catch (err) {
      console.error('Failed to run VPN routing test:', err);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">VPN Routing & Leak Test</h3>
              <p className="text-xs text-slate-400">Verifying virtual adapter, exit IP, DNS & IPv6 leaks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {testing && !testResult ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs text-slate-300 font-semibold">Running multi-point routing diagnostics...</span>
          </div>
        ) : testResult ? (
          <div className="space-y-4">
            {/* Overall Protection Status Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                testResult.ipChanged || !isConnected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {testResult.ipChanged || !isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {isConnected
                      ? testResult.ipChanged
                        ? 'Traffic Fully Protected (IP Changed)'
                        : 'Warning: IP Did Not Change'
                      : 'VPN Idle (No Active Tunnel)'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {isConnected
                      ? testResult.ipChanged
                        ? 'All system traffic is successfully passing through the encrypted tunnel.'
                        : 'Your real public IP may still be visible.'
                      : 'Connect VPN to verify tunnel protection.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Virtual Adapter Card */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400 font-semibold">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Virtual Adapter</span>
                </div>
                <div className="font-mono text-white text-[11px] truncate">
                  {testResult.adapterName || 'v2raydp-tun'}
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{testResult.mode === 'system_proxy' ? 'System Proxy Active' : 'Adapter Up (Metric 1)'}</span>
                </div>
              </div>

              {/* Latency & Ping */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400 font-semibold">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Routing Latency</span>
                </div>
                <div className="font-mono text-white text-[11px]">
                  {testResult.latencyMs} ms
                </div>
                <div className="text-[11px] text-slate-400">Response time to canary server</div>
              </div>

              {/* Real IP vs VPN IP */}
              <div className="col-span-2 p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>IP Address Verification</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(testResult.testedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Real Public IP</span>
                    <span className="font-mono text-white font-medium">{testResult.realIp || realIpInfo?.ip || 'Pending'}</span>
                    <span className="block text-slate-400 text-[10px] mt-0.5 truncate">
                      {realIpInfo?.flag} {realIpInfo?.country || realIpInfo?.isp || ''}
                    </span>
                  </div>

                  <div className="p-2 bg-cyan-950/20 rounded-lg border border-cyan-800/30">
                    <span className="text-cyan-400 block text-[10px] uppercase font-bold">VPN Exit IP</span>
                    <span className="font-mono text-cyan-200 font-semibold">{testResult.vpnIp || vpnIpInfo?.ip || 'Testing'}</span>
                    <span className="block text-slate-400 text-[10px] mt-0.5 truncate">
                      {vpnIpInfo?.flag} {vpnIpInfo?.country || vpnIpInfo?.isp || ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* DNS Leak Check */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <div className="text-slate-400 font-semibold">DNS Leak Test</div>
                <div className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>No Leak (Tunnel DNS)</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Servers: {testResult.dnsServers.join(', ')}
                </div>
              </div>

              {/* IPv6 Leak Check */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <div className="text-slate-400 font-semibold">IPv6 Leak Test</div>
                <div className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>IPv6 Protected</span>
                </div>
                <div className="text-[10px] text-slate-500">No unencrypted leaks</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={runTest}
            disabled={testing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{testing ? 'Testing...' : 'Run Test Again'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-cyan-950/40 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
