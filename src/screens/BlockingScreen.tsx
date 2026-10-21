import React, { useState } from 'react';
import { BlockSettings } from '../core/types';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Globe,
  Bug,
  Activity,
  AlertCircle
} from 'lucide-react';
import { BlockManager } from '../core/BlockManager';

interface BlockingScreenProps {
  blockSettings: BlockSettings;
  onSaveSettings: (settings: BlockSettings) => Promise<boolean>;
  onUpdateLists: () => Promise<{ success: boolean; count: number; error?: string }>;
  onAddCustomRule: (domain: string) => Promise<boolean>;
  onRemoveCustomRule: (domain: string) => Promise<boolean>;
}

export const BlockingScreen: React.FC<BlockingScreenProps> = ({
  blockSettings,
  onSaveSettings,
  onUpdateLists,
  onAddCustomRule,
  onRemoveCustomRule
}) => {
  const [newDomain, setNewDomain] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleToggleMaster = async (enabled: boolean) => {
    await onSaveSettings({
      ...blockSettings,
      isBlockingEnabled: enabled
    });
  };

  const handleToggleCategory = async (sourceId: string, enabled: boolean) => {
    const updatedSources = blockSettings.sources.map((s) =>
      s.id === sourceId ? { ...s, enabled } : s
    );
    await onSaveSettings({
      ...blockSettings,
      sources: updatedSources
    });
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdateLists();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const normalized = BlockManager.normalizeCustomRule(newDomain);
    if (!normalized) {
      setInputError('Please enter a valid domain (e.g. example.com or ads.tracker.org)');
      return;
    }

    const success = await onAddCustomRule(normalized);
    if (success) {
      setNewDomain('');
    } else {
      setInputError('Domain is already in your blocklist');
    }
  };

  const getSourceIcon = (id: string) => {
    switch (id) {
      case 'ads':
        return ShieldCheck;
      case 'trackers':
        return Globe;
      case 'malware':
        return Bug;
      default:
        return Layers;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span>Ad & Threat Blocking</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Reject intrusive ad networks, telemetry trackers, and phishing domains directly inside the sing-box routing engine.
        </p>
      </div>

      {/* Master Toggle Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white">Ad & Threat Blocking Engine</h3>
            {blockSettings.isBlockingEnabled && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Rejects matched ad and tracking domains via sing-box rule-set with zero latency impact
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={blockSettings.isBlockingEnabled}
            onChange={(e) => handleToggleMaster(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
        </label>
      </div>

      {/* Info & Counter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Domains */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Active Blocked Domains</div>
            <div className="text-lg font-bold text-white font-mono">
              {(blockSettings.totalDomains || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Intercepted Requests */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Blocked Requests Count</div>
            <div className="text-lg font-bold text-white font-mono">
              {blockSettings.totalBlockedCount !== null ? (
                <>
                  {blockSettings.totalBlockedCount.toLocaleString()}{' '}
                  <span className="text-xs text-emerald-400 font-sans">
                    ({blockSettings.sessionBlockedCount || 0} session)
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-500 font-sans font-normal">not available</span>
              )}
            </div>
          </div>
        </div>

        {/* Last Updated + Update Button */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Last Updated</span>
            </div>
            <div className="text-xs font-semibold text-slate-300 font-mono">
              {blockSettings.lastUpdatedTimestamp
                ? new Date(blockSettings.lastUpdatedTimestamp).toLocaleDateString()
                : 'Never'}
            </div>
          </div>

          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isUpdating ? 'Updating…' : 'Update Lists'}</span>
          </button>
        </div>
      </div>

      {/* Blocklist Categories */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Blocklist Categories</span>
        </h3>

        <div className="space-y-3">
          {blockSettings.sources.map((source) => {
            const Icon = getSourceIcon(source.id);
            return (
              <div
                key={source.id}
                className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{source.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                        {source.format}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{source.description}</p>
                    <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5 truncate max-w-md">
                      {source.url}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                    ~{source.domainCount.toLocaleString()} domains
                  </span>
                  <input
                    type="checkbox"
                    checked={source.enabled}
                    disabled={!blockSettings.isBlockingEnabled}
                    onChange={(e) => handleToggleCategory(source.id, e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Rules Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <span>My Custom Block Rules</span>
        </h3>

        <form onSubmit={handleAddDomain} className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => {
                setNewDomain(e.target.value);
                setInputError(null);
              }}
              placeholder="e.g. ads.example.com or *.telemetry.net"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>
          </div>
          {inputError && (
            <p className="text-xs text-red-400 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>{inputError}</span>
            </p>
          )}
        </form>

        {/* Custom Rules List */}
        <div className="space-y-2 pt-2">
          {blockSettings.customRules.length === 0 ? (
            <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs text-slate-500 text-center">
              No custom rules added yet. Enter a domain above to block it.
            </div>
          ) : (
            blockSettings.customRules.map((rule) => (
              <div
                key={rule}
                className="px-3.5 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2 font-mono text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{rule}</span>
                </div>
                <button
                  onClick={() => onRemoveCustomRule(rule)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  title="Remove Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
