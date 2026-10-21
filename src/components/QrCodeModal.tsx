import React, { useState, useEffect } from 'react';
import { ServerProfile } from '../core/types';
import { VmessLinkParser } from '../core/VmessLinkParser';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  profile: ServerProfile | null;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  profile,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile && isOpen) {
      const link = VmessLinkParser.toShareLink(profile);
      setShareLink(link);

      if (window.api?.generateQrCode) {
        window.api.generateQrCode(link).then(setQrDataUrl);
      }
    } else {
      setQrDataUrl(null);
      setShareLink('');
      setCopied(false);
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const handleCopy = async () => {
    if (window.api?.copyToClipboard) {
      await window.api.copyToClipboard(shareLink);
    } else {
      await navigator.clipboard.writeText(shareLink);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-cyan-400">
            <QrCode className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Share Server Profile</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 flex flex-col items-center">
          <div className="p-3 bg-slate-900 border-2 border-cyan-500/40 rounded-xl shadow-lg shadow-cyan-500/10 mb-3">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Server QR Code" className="w-56 h-56 rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-500">
                Generating QR code…
              </div>
            )}
          </div>

          <h4 className="text-sm font-bold text-white mb-0.5 truncate max-w-full px-2">{profile.name}</h4>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 uppercase">
            {profile.protocol.toUpperCase()} • {profile.network.toUpperCase()} • {profile.tls.toUpperCase()}
          </span>

          <div className="mt-3 w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-400 text-left break-all max-h-16 overflow-y-auto">
            {shareLink}
          </div>
        </div>

        <div className="pt-2 flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              copied
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/20'
            } shadow-lg`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
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
  );
};
