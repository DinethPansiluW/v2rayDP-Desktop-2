import React from 'react';
import { ConnectionState } from '../core/types';
import { Zap, Wifi, Split, Radio, ShieldCheck, Sliders, Info, ShieldAlert } from 'lucide-react';
import logo from '../assets/logo.png';

export type ActiveTab = 'home' | 'automation' | 'exclude' | 'hotspot' | 'blocking' | 'settings' | 'about';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  connectionState: ConnectionState;
  hotspotEnabled: boolean;
  adBlockEnabled: boolean;
  isElevated?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  connectionState,
  hotspotEnabled,
  adBlockEnabled,
  isElevated = true
}) => {
  const isConnected = connectionState.status === 'connected';
  const isConnecting = connectionState.status === 'connecting';
  const isError = connectionState.status === 'error';

  const mainNav = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Zap },
    { id: 'automation' as ActiveTab, label: 'Automation', icon: Wifi },
    { id: 'exclude' as ActiveTab, label: 'Exclude', icon: Split },
    { id: 'hotspot' as ActiveTab, label: 'Hotspot', icon: Radio, badge: hotspotEnabled },
    { id: 'blocking' as ActiveTab, label: 'Blocking', icon: ShieldCheck, badge: adBlockEnabled }
  ];

  const bottomNav = [
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Sliders },
    { id: 'about' as ActiveTab, label: 'About', icon: Info }
  ];

  return (
    <aside className="w-16 shrink-0 h-screen sticky top-0 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col items-center py-3.5 select-none z-50 justify-between">
      {/* Top: Round Logo & Brand */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => onTabChange('home')}
          title="v2rayDP Desktop"
          className="group relative w-10 h-10 rounded-full flex items-center justify-center overflow-visible hover:scale-105 active:scale-95 transition-all"
        >
          <img
            src={logo}
            alt="v2rayDP"
            className="w-10 h-10 rounded-full object-cover aspect-square ring-2 ring-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
          />
          {/* Status Indicator Dot on logo */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0f1d] z-10 ${
              isConnected
                ? 'bg-emerald-400'
                : isConnecting
                ? 'bg-amber-400 animate-pulse'
                : isError
                ? 'bg-red-400'
                : 'bg-slate-500'
            }`}
          />
        </button>

        {/* Divider */}
        <div className="w-8 h-px bg-slate-800/90" />

        {/* Main Navigation: Home | Automation | Exclude | Hotspot | Blocking */}
        <nav className="flex flex-col items-center space-y-2">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group flex items-center justify-center">
                <button
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-cyan-500/25 to-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />

                  {/* Active Indicator Bar on Left */}
                  {isActive && (
                    <span className="absolute -left-2.5 top-2.5 bottom-2.5 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  )}

                  {/* Active Badge Dot */}
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  )}
                </button>

                {/* Hover Tooltip */}
                <div className="absolute left-14 ml-2 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl z-50">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Navigation: Settings | About */}
      <div className="flex flex-col items-center space-y-2 pt-2 border-t border-slate-800/80 w-full">
        {!isElevated && (
          <div className="relative group flex items-center justify-center mb-1">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-400 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="absolute left-14 ml-2 px-2.5 py-1 bg-amber-950 border border-amber-700/80 rounded-lg text-xs font-medium text-amber-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl z-50">
              Admin rights needed
            </div>
          </div>
        )}

        {bottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group flex items-center justify-center">
              <button
                onClick={() => onTabChange(item.id)}
                aria-label={item.label}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-tr from-cyan-500/25 to-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />

                {isActive && (
                  <span className="absolute -left-2.5 top-2.5 bottom-2.5 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                )}
              </button>

              <div className="absolute left-14 ml-2 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl z-50">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
