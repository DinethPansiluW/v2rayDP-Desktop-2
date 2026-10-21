import { describe, it, expect } from 'vitest';
import { AutomationDecision } from '../src/core/AutomationDecision';
import { AutomationSettings, WifiStatus } from '../src/core/types';

describe('AutomationDecision Engine - SSID Rules & Policies', () => {
  const baseSettings: AutomationSettings = {
    isAutomationGloballyEnabled: true,
    rules: [
      {
        id: 'rule-home',
        ssid: 'HomeWiFi',
        action: 'connect',
        profileId: 'profile-home-sg',
        enabled: true
      },
      {
        id: 'rule-office',
        ssid: 'OfficeWiFi',
        action: 'connect',
        profileId: 'profile-office-us',
        enabled: true
      },
      {
        id: 'rule-cafe',
        ssid: 'CafeWiFi',
        action: 'do_not_connect',
        profileId: null,
        enabled: true
      },
      {
        id: 'rule-disabled-guest',
        ssid: 'GuestWiFi',
        action: 'connect',
        profileId: 'profile-guest',
        enabled: false // Disabled rule
      }
    ],
    fallbackRule: {
      enabled: true,
      action: 'connect',
      profileId: 'profile-fallback-fra'
    },
    autoStopOnWifiLeave: true,
    wifiLeavePolicy: 'STOP_VPN',
    autoStopOnWifiOff: true,
    autoReconnectOnWifiReturn: true,
    manualOverrideSuppressed: false,
    manualOverrideReason: '',
    manualOverrideNetworkKey: null,
    manualConnectedProfileId: null,
    manualConnectedNetworkKey: null,
    stoppedByLeaveWifiSsid: null
  };

  it('1. should match exact SSID and auto-start assigned profile', () => {
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'HomeWiFi'
    };

    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    expect(result.action.type).toBe('START_VPN');
    if (result.action.type === 'START_VPN') {
      expect(result.action.profileId).toBe('profile-home-sg');
    }
  });

  it('2. should match SSID case-insensitively', () => {
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'homewifi' // Lowercase input matches 'HomeWiFi' rule
    };

    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    expect(result.action.type).toBe('START_VPN');
    if (result.action.type === 'START_VPN') {
      expect(result.action.profileId).toBe('profile-home-sg');
    }
  });

  it('3. should fall back to "Any other Wi-Fi" when no specific rule exists and fallback is ON', () => {
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'Unknown_Airport_Network'
    };

    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    expect(result.action.type).toBe('START_VPN');
    if (result.action.type === 'START_VPN') {
      expect(result.action.profileId).toBe('profile-fallback-fra');
    }
  });

  it('4. should NEVER auto-connect on unknown networks when "Any other Wi-Fi" switch is OFF', () => {
    const settings: AutomationSettings = {
      ...baseSettings,
      fallbackRule: {
        enabled: false, // Switch is OFF
        action: 'connect',
        profileId: 'profile-fallback-fra'
      }
    };

    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'Unknown_Airport_Network'
    };

    const result = AutomationDecision.evaluate({
      settings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    expect(result.action.type).toBe('NO_OP');
    expect(result.statusMessage).toContain('"Any other Wi-Fi" fallback is OFF');
  });

  it('5. should execute "Do not connect" rule and stop VPN if running', () => {
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'CafeWiFi' // Configured as action: 'do_not_connect'
    };

    // When running
    const resultRunning = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'connected',
      isVpnRunning: true,
      runningProfileId: 'profile-home-sg'
    });

    expect(resultRunning.action.type).toBe('STOP_VPN');
    expect(resultRunning.action.reason).toContain('Do not connect');

    // When already disconnected
    const resultIdle = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    expect(resultIdle.action.type).toBe('NO_OP');
    expect(resultIdle.statusMessage).toContain('Do not connect');
  });

  it('6. should switch profile when switching directly from Wi-Fi A to Wi-Fi B', () => {
    const wifiStatusB: WifiStatus = {
      connected: true,
      ssid: 'OfficeWiFi' // Associated with profile-office-us
    };

    // User was already connected with profile-home-sg from HomeWiFi
    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus: wifiStatusB,
      currentConnectionStatus: 'connected',
      isVpnRunning: true,
      runningProfileId: 'profile-home-sg'
    });

    expect(result.action.type).toBe('SWITCH_VPN');
    if (result.action.type === 'SWITCH_VPN') {
      expect(result.action.profileId).toBe('profile-office-us');
    }
  });

  it('7. should not restart if already running with the matched profile', () => {
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'HomeWiFi'
    };

    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'connected',
      isVpnRunning: true,
      runningProfileId: 'profile-home-sg'
    });

    expect(result.action.type).toBe('NO_OP');
  });

  it('8. should ignore disabled rule so that SSID falls back to "Any other Wi-Fi"', () => {
    // "GuestWiFi" has a disabled rule; fallbackRule is enabled with profile-fallback-fra
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'GuestWiFi'
    };

    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    // Disabled rule is ignored completely, so it falls back to "Any other Wi-Fi" (which is ON)
    expect(result.action.type).toBe('START_VPN');
    if (result.action.type === 'START_VPN') {
      expect(result.action.profileId).toBe('profile-fallback-fra');
    }
  });

  it('8b. should NOT auto-connect on network with enabled "Do not connect" rule', () => {
    // "CafeWiFi" has an enabled rule with action: "do_not_connect"
    const wifiStatus: WifiStatus = {
      connected: true,
      ssid: 'CafeWiFi'
    };

    const result = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus,
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });

    // An enabled "do_not_connect" rule guarantees no connection is made
    expect(result.action.type).toBe('NO_OP');
    expect(result.statusMessage).toContain('Rule: Do not connect');
  });

  it('9. should handle Wi-Fi leave policies (STOP_VPN vs KEEP_VPN)', () => {
    const disconnectedStatus: WifiStatus = {
      connected: false,
      ssid: null
    };

    // With STOP_VPN
    const stopResult = AutomationDecision.evaluate({
      settings: baseSettings,
      wifiStatus: disconnectedStatus,
      currentConnectionStatus: 'connected',
      isVpnRunning: true
    });
    expect(stopResult.action.type).toBe('STOP_VPN');

    // With KEEP_VPN
    const keepSettings: AutomationSettings = {
      ...baseSettings,
      wifiLeavePolicy: 'KEEP_VPN'
    };
    const keepResult = AutomationDecision.evaluate({
      settings: keepSettings,
      wifiStatus: disconnectedStatus,
      currentConnectionStatus: 'connected',
      isVpnRunning: true
    });
    expect(keepResult.action.type).toBe('NO_OP');
  });

  it('10. should honor manual disconnect override and clear it when network changes', () => {
    const suppressedSettings: AutomationSettings = {
      ...baseSettings,
      manualOverrideSuppressed: true,
      manualOverrideReason: 'User disconnected',
      manualOverrideNetworkKey: 'WIFI:HomeWiFi'
    };

    // On same network
    const sameNetworkResult = AutomationDecision.evaluate({
      settings: suppressedSettings,
      wifiStatus: { connected: true, ssid: 'HomeWiFi' },
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });
    expect(sameNetworkResult.action.type).toBe('NO_OP');
    expect(sameNetworkResult.updatedSettings.manualOverrideSuppressed).toBe(true);

    // On different network
    const changedNetworkResult = AutomationDecision.evaluate({
      settings: suppressedSettings,
      wifiStatus: { connected: true, ssid: 'OfficeWiFi' },
      currentConnectionStatus: 'disconnected',
      isVpnRunning: false
    });
    expect(changedNetworkResult.updatedSettings.manualOverrideSuppressed).toBe(false);
    expect(changedNetworkResult.action.type).toBe('START_VPN');
  });

  it('11. should preserve manual connect on same network without letting automation switch it', () => {
    const manualConnectSettings: AutomationSettings = {
      ...baseSettings,
      manualConnectedProfileId: 'profile-special-manual',
      manualConnectedNetworkKey: 'WIFI:HomeWiFi'
    };

    // While on HomeWiFi, user manually chose profile-special-manual
    const result = AutomationDecision.evaluate({
      settings: manualConnectSettings,
      wifiStatus: { connected: true, ssid: 'HomeWiFi' },
      currentConnectionStatus: 'connected',
      isVpnRunning: true,
      runningProfileId: 'profile-special-manual'
    });

    expect(result.action.type).toBe('NO_OP');
    expect(result.statusMessage).toContain('Preserving manual connection');
  });
});
