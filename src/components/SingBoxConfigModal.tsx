import React, { useState } from 'react';
import { ServerProfile } from '../core/types';
import { VmessLinkParser } from '../core/VmessLinkParser';
import { X, Copy, Check, FileJson } from 'lucide-react';

interface SingBoxConfigModalProps {
  isOpen: boolean;
  profile: ServerProfile | null;
  onClose: () => void;
}

export const SingBoxConfigModal: React.FC<SingBoxConfigModalProps> = ({
  isOpen,
  profile,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !profile) return null;

  const jsonConfig = VmessLinkParser.toSingBoxConfigJson(profile, {
    clashApiPort: 9090,
    bypassLan: true,
    primaryDns: '1.1.1.1',
    secondaryDns: '8.8.8.8'
  });

  const handleCopy = async () => {
    if (window.api?.copyToClipboard) {
      await window.api.copyToClipboard(jsonConfig);
    } else {
      await navigator.clipboard.writeText(jsonConfig);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2 text-cyan-400">
            <FileJson className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold text-white">Generated sing-box config.json</h3>
              <p className="text-[11px] text-slate-400">Target: {profile.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto select-text">
            <pre>{jsonConfig}</pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">Compliance: sing-box 1.13+ (VPN TUN Mode)</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/20'
              } shadow-lg`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
