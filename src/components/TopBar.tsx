import React from 'react';
import { ConnectionState } from '../core/types';
import { Activity, ShieldCheck, Wifi, Radio, Sliders, Info, Zap } from 'lucide-react';
import logo from '../assets/logo.png';

export type ActiveTab = 'dashboard' | 'automation' | 'hotspot' | 'blocking' | 'settings' | 'about';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  connectionState: ConnectionState;
  hotspotEnabled: boolean;
  adBlockEnabled: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  connectionState,
  hotspotEnabled,
  adBlockEnabled
}) => {
  const isConnected = connectionState.status === 'connected';
  const isConnecting = connectionState.status === 'connecting';
  const isError = connectionState.status === 'error';

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: Zap },
    { id: 'automation' as ActiveTab, label: 'Automation', icon: Wifi },
    { id: 'hotspot' as ActiveTab, label: 'Hotspot', icon: Radio, badge: hotspotEnabled ? 'ON' : undefined },
    { id: 'blocking' as ActiveTab, label: 'Ad Blocking', icon: ShieldCheck, badge: adBlockEnabled ? 'ON' : undefined },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Sliders },
    { id: 'about' as ActiveTab, label: 'About', icon: Info }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d1322]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between select-none">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
        <div className="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-cyan-400/80 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center overflow-hidden">
          <img src={logo} alt="v2rayDP Logo" className="w-full h-full object-contain rounded-full" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-wide text-base">v2rayDP</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              DESKTOP
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">VLESS & VMess TUN Client</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[9px] px-1 py-0.2 bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Status Pill & System Mode */}
      <div className="flex items-center space-x-2">
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Engine:</span>
          <span className="font-mono text-cyan-300 font-medium">VPN (TUN)</span>
        </div>

        {/* Live State Badge */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
              : isConnecting
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
              : isError
              ? 'bg-red-950/80 border-red-500/50 text-red-300'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 animate-pulse'
                : isConnecting
                ? 'bg-amber-400'
                : isError
                ? 'bg-red-400'
                : 'bg-slate-500'
            }`}
          />
          <span className="capitalize">
            {isConnected ? 'Connected' : isConnecting ? 'Connecting' : isError ? 'Error' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
};
